import path from "path";
import multer from "multer";
import mammoth from "mammoth";
import type { RequestHandler } from "express";
import { MAX_FILE_SIZE_BYTES, ALLOWED_UPLOAD_EXTENSIONS } from "./constants";

export const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if ((ALLOWED_UPLOAD_EXTENSIONS as readonly string[]).includes(ext)) cb(null, true);
    else cb(new Error("Only .txt, .doc, and .docx files are allowed"));
  },
});

export const uploadFileHandler: RequestHandler = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" }) as unknown as void;

    const ext = path.extname(req.file.originalname).toLowerCase();
    let text = "";

    if (ext === ".txt") {
      text = req.file.buffer.toString("utf-8");
    } else if (ext === ".docx" || ext === ".doc") {
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      text = result.value;
    }

    if (!text.trim()) return res.status(400).json({ error: "File appears to be empty or could not be read" }) as unknown as void;

    res.json({ text, filename: req.file.originalname });
  } catch (error) {
    console.error("File upload error:", error);
    res.status(500).json({ error: "Failed to extract text from file" });
  }
};
