#!/bin/bash

# File log job yang sudah dibuat
JOB_LOGS="job_logs.txt"
# File untuk menyimpan hasil pengecekan
STATUS_LOG="bullmq_status_$(date +%Y%m%d_%H%M%S).log"

# Fungsi untuk mengecek status job
get_job_status() {
    local job_id=$1
    local response
    
    echo -n "Checking job $job_id... " >&2
    response=$(curl -v "http://localhost:3000/api/email/job/$job_id" 2>/dev/null)
    local status=$(echo "$response" | jq -r '.job.status // .status // "unknown"' 2>/dev/null)
    
    if [ -z "$status" ] || [ "$status" = "null" ]; then
        echo "Raw response for job $job_id:" >&2
        echo "$response" >&2
        echo "unknown"
        return 1
    fi
    
    echo "$status"
    return 0
}

echo "=== Mulai pengecekan status job BullMQ ===" | tee "$STATUS_LOG"
echo "Waktu: $(date)" | tee -a "$STATUS_LOG"
echo "======================================" | tee -a "$STATUS_LOG"

# Inisialisasi counter
completed=0
active=0
waiting=0
delayed=0
failed=0
other=0
total_jobs=0

# Baca file log job dan proses setiap job ID
while IFS= read -r line; do
    # Hanya ambil baris yang berisi angka (job ID)
    if [[ $line =~ ^[0-9]+$ ]]; then
        job_id=$line
        printf "Job %-10s : " "$job_id" | tee -a "$STATUS_LOG"
        
        status=$(get_job_status "$job_id")
        echo -n "$status" | tee -a "$STATUS_LOG"
        echo "" | tee -a "$STATUS_LOG"  # New line
        
        # Update counter
        case "$status" in
            "completed") ((completed++)) ;;
            "active") ((active++)) ;;
            "waiting") ((waiting++)) ;;
            "delayed") ((delayed++)) ;;
            "failed") ((failed++)) ;;
            *) 
                ((other++))
                echo "  Raw response for job $job_id:" | tee -a "$STATUS_LOG"
                curl -s "http://localhost:3000/api/email/job/$job_id" | jq . | tee -a "$STATUS_LOG"
                ;;
        esac
        
        ((total_jobs++))
        
        # Add small delay to avoid overwhelming the server
        sleep 0.1
    fi
done < "$JOB_LOGS"

# Tampilkan ringkasan
echo -e "\n=== Ringkasan Status Job ===" | tee -a "$STATUS_LOG"
echo "Total Jobs   : $total_jobs" | tee -a "$STATUS_LOG"
echo "Completed    : $completed" | tee -a "$STATUS_LOG"
echo "Active       : $active" | tee -a "$STATUS_LOG"
echo "Waiting      : $waiting" | tee -a "$STATUS_LOG"
echo "Delayed      : $delayed" | tee -a "$STATUS_LOG"
echo "Failed       : $failed" | tee -a "$STATUS_LOG"
[ $other -gt 0 ] && echo "Other/Unknown: $other" | tee -a "$STATUS_LOG"

echo "======================================" | tee -a "$STATUS_LOG"
echo "Pengecekan selesai pada: $(date)" | tee -a "$STATUS_LOG"
echo "Hasil lengkap tersimpan di: $STATUS_LOG" | tee -a "$STATUS_LOG"