// src/config/multer.config.ts
import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";

const uploadDir = process.env.UPLOAD_DIR || "./uploads/attachments";

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-hash-originalname
    const timestamp = Date.now();
    const hash = crypto.randomBytes(8).toString("hex");
    const ext = path.extname(file.originalname);
    const nameWithoutExt = path.basename(file.originalname, ext);
    const uniqueName = `${timestamp}-${hash}-${nameWithoutExt}${ext}`;
    cb(null, uniqueName);
  },
});

// File filter - only allow specific file types
const fileFilter = (
  req: any,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
) => {
  const allowedMimes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "text/plain",
    "text/csv",
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`));
  }
};

// Multer upload instance
export const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
});

// Upload configurations
export const uploadSingle = upload.single("file"); // Single file
export const uploadMultiple = upload.array("files", 10); // Max 10 files
export const uploadFields = upload.fields([
  { name: "attachments", maxCount: 10 },
  { name: "images", maxCount: 5 },
]);
