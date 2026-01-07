import multer from "multer";
import path from "path";
import { existsSync, mkdirSync } from "fs";
import { Request } from "express";

// Ensure uploads directory exists
const uploadsDir = path.join(process.cwd(), "uploads", "resumes");
if (!existsSync(uploadsDir)) {
  mkdirSync(uploadsDir, { recursive: true });
  console.log("[upload] Created uploads directory:", uploadsDir);
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req: Request, file: Express.Multer.File, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req: Request, file: Express.Multer.File, cb) => {
    const userId = req.session?.userId || "unknown";
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filename = `${userId}_${timestamp}_${safeName}`;
    cb(null, filename);
  },
});

// File filter to accept only PDF and DOCX
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/msword", // .doc files
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only PDF and DOCX files are allowed."
      ) as any
    );
  }
};

// Configure multer with storage, file filter, and size limits
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Export uploads directory path for use in other modules
export { uploadsDir };
