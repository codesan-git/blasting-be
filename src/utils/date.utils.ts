/**
 * Nama hari dalam Bahasa Indonesia (Minggu = 0, Senin = 1, ... Sabtu = 6)
 */
const INDONESIAN_DAY_NAMES: Record<number, string> = {
  0: "Minggu",
  1: "Senin",
  2: "Selasa",
  3: "Rabu",
  4: "Kamis",
  5: "Jumat",
  6: "Sabtu",
};

/** Bulan Indonesia -> angka 1-12 (untuk parsing) */
const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 1,
  februari: 2,
  maret: 3,
  april: 4,
  mei: 5,
  juni: 6,
  juli: 7,
  agustus: 8,
  september: 9,
  oktober: 10,
  november: 11,
  desember: 12,
};

/**
 * Mengembalikan nama hari dalam Bahasa Indonesia dari objek Date.
 * getDay() = 0 (Minggu) .. 6 (Sabtu).
 */
export function getIndonesianDayName(date: Date): string {
  const day = date.getDay();
  return INDONESIAN_DAY_NAMES[day] ?? "";
}

/**
 * Mencoba mem-parse string menjadi Date.
 * Mendukung:
 * - ISO 8601: "2026-12-25", "2026-12-25T09:30:00.000Z", "2026-12-25T16:30:00+07:00"
 * - Format umum: "25 Dec 2026", "06-Nov-25", "25-MAR-26"
 * - Indonesia: "25 Desember 2026", "25 Des 2026"
 * Mengembalikan null jika tidak bisa di-parse.
 */
export function parseDateFromString(value: string): Date | null {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // 1. Coba langsung (ISO & format yang didukung JS)
  const direct = new Date(trimmed);
  if (!Number.isNaN(direct.getTime())) return direct;

  // 2. Coba ekstrak bagian tanggal dari string (mis. "25 Desember 2026, 14:30 WIB" -> "25 Desember 2026")
  const datePart = trimmed.split(",")[0].trim();
  if (datePart !== trimmed) {
    const fromPart = new Date(datePart);
    if (!Number.isNaN(fromPart.getTime())) return fromPart;
  }

  // 3. Pola "DD Bulan YYYY" (Indonesia)
  const idMatch = datePart.match(
    /^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{4})$/,
  );
  if (idMatch) {
    const [, d, monthStr, y] = idMatch;
    const monthKey = monthStr.toLowerCase().replace(/\./g, "");
    const month = INDONESIAN_MONTHS[monthKey];
    if (month) {
      const date = new Date(Number(y), month - 1, Number(d));
      if (!Number.isNaN(date.getTime())) return date;
    }
  }

  // 4. Pola "DD-MMM-YY" atau "DD-MMM-Y YYYY"
  const shortMatch = datePart.match(
    /^(\d{1,2})[-/]([a-zA-Z]{3})[-/](\d{2,4})$/,
  );
  if (shortMatch) {
    const shortParsed = new Date(datePart.replace(/-/g, " "));
    if (!Number.isNaN(shortParsed.getTime())) return shortParsed;
  }

  return null;
}

/**
 * Mengembalikan nama hari Indonesia dari string tanggal, atau null jika tidak bisa di-parse.
 */
export function getIndonesianDayNameFromString(value: string): string | null {
  const date = parseDateFromString(value);
  if (!date) return null;
  return getIndonesianDayName(date);
}
