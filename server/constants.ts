import path from "path";

// ── TTL / intervals ──────────────────────────────────────────────────────────
export const SLIDES_TTL_MS = 3_600_000; // 1 hour
export const SLIDES_CLEANUP_INTERVAL_MS = 600_000; // 10 minutes

// ── Rate limits ───────────────────────────────────────────────────────────────
export const RATE_LIMIT_WINDOW_MS = 60_000;
export const RATE_LIMIT_AI = 5;
export const RATE_LIMIT_DRIVE = 20;
export const RATE_LIMIT_GLOBAL = 60;
export const RATE_LIMIT_CALENDAR = 10;

// ── File upload ───────────────────────────────────────────────────────────────
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const MAX_JSON_BODY = "10mb";
export const ALLOWED_UPLOAD_EXTENSIONS = [".txt", ".doc", ".docx"] as const;

// ── Google OAuth ──────────────────────────────────────────────────────────────
export const OAUTH_REDIRECT_URI = "http://localhost:3001/api/auth/google/callback";
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/presentations",
  "https://www.googleapis.com/auth/calendar",
] as const;

// ── Google Drive ──────────────────────────────────────────────────────────────
export const DRIVE_FOLDER_NAME = "Project Pulse";
export const PPTX_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.presentationml.presentation";

// ── Paths ─────────────────────────────────────────────────────────────────────
export const NEWSLETTERS_DIR = path.join(process.cwd(), "newsletters");
export const TOKENS_FILE = path.join(process.cwd(), ".google-tokens.json");
