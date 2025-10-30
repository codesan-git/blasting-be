#!/bin/bash

# File untuk menyimpan job IDs
JOB_LOGS="job_logs.txt"
> "$JOB_LOGS"  # Kosongkan file log jika sudah ada

for i in {1..200}  # 200 x 5 = 1000 email
do
  response=$(curl -s -X POST http://localhost:3000/api/email/blast \
    -H "Content-Type: application/json" \
    -d '{
      "recipients": [
        {"email": "user1@example.com", "name": "User 1"},
        {"email": "user2@example.com", "name": "User 2"},
        {"email": "user3@example.com", "name": "User 3"},
        {"email": "user4@example.com", "name": "User 4"},
        {"email": "user5@example.com", "name": "User 5"}
      ],
      "subject": "Load Test Email - Run '$i'",
      "body": "Testing email blast system - Run '$i' of 200",
      "from": "noreply@example.com"
    }')

  # Ekstrak job IDs dan simpan ke file
  echo "Batch $i - $(date)" >> "$JOB_LOGS"
  echo "$response" | jq -r '.jobIds[]' >> "$JOB_LOGS"
  echo "------------------------" >> "$JOB_LOGS"
  
  echo "Sent batch $i/200"
  sleep 1
done