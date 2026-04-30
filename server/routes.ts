import fs from "fs";
import express from "express";
import rateLimit from "express-rate-limit";
import { google } from "googleapis";
import {
  RATE_LIMIT_WINDOW_MS,
  RATE_LIMIT_AI,
  RATE_LIMIT_DRIVE,
  RATE_LIMIT_GLOBAL,
  RATE_LIMIT_CALENDAR,
  GOOGLE_SCOPES,
  TOKENS_FILE,
} from "./constants";
import { getOAuth2Client, loadTokens, saveTokens } from "./auth";
import { upload, uploadFileHandler } from "./upload";
import { analyzeMeetingNotesHandler, getNewslettersHandler, saveNewsletterHandler, deleteNewsletterHandler, draftNewsletterHandler } from "./newsletter";
import { saveToDriveHandler, saveSlideHandler } from "./drive";
import { createSlidesHandler, previewSlideHandler, downloadSlideHandler } from "./slides";
import { generateAgendaHandler, createEventHandler, listEventsHandler } from "./calendar";
import { sendInvitesHandler } from "./email";

const router = express.Router();

// ── Rate limiters ─────────────────────────────────────────────────────────────
const aiLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_AI,
  message: { error: "Too many requests — AI calls are limited to 5/min. Please slow down." },
  standardHeaders: true, legacyHeaders: false,
});
const driveLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_DRIVE,
  message: { error: "Too many requests — Drive calls are limited to 20/min. Please slow down." },
  standardHeaders: true, legacyHeaders: false,
});
const globalLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_GLOBAL,
  message: { error: "Too many requests. Please slow down." },
  standardHeaders: true, legacyHeaders: false,
});
const calendarLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_CALENDAR,
  message: { error: "Too many Calendar requests — limited to 10/min. Please slow down." },
  standardHeaders: true, legacyHeaders: false,
});

router.use("/analyze", aiLimiter);
router.use("/newsletters/draft", aiLimiter);
router.use("/calendar/generate-agenda", aiLimiter);
router.use("/drive/save", driveLimiter);
router.use("/drive/save-slide", driveLimiter);
router.use("/drive/create-slides", driveLimiter);
router.use("/calendar", calendarLimiter);
router.use("/", globalLimiter);

// ── File upload ───────────────────────────────────────────────────────────────
router.post("/upload-file", (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) return res.status(400).json({ error: (err as Error).message });
    next();
  });
}, uploadFileHandler);

// ── Analysis ──────────────────────────────────────────────────────────────────
router.post("/analyze", analyzeMeetingNotesHandler);

// ── Newsletters ───────────────────────────────────────────────────────────────
router.post("/newsletters/draft", draftNewsletterHandler);
router.get("/newsletters", getNewslettersHandler);
router.post("/newsletters", saveNewsletterHandler);
router.delete("/newsletters/:id", deleteNewsletterHandler);

// ── Google OAuth ──────────────────────────────────────────────────────────────
router.get("/auth/google/url", (req, res) => {
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    return res.status(400).json({ error: "Google credentials not configured. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to your .env file." }) as unknown as void;
  }
  const url = getOAuth2Client().generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_SCOPES],
  });
  res.json({ url });
});

router.get("/auth/google/callback", async (req, res) => {
  try {
    const { code } = req.query;
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code as string);
    saveTokens(tokens);
    res.send(`<html><body><script>
      window.opener && window.opener.postMessage('google-auth-success', '*');
      window.close();
    </script><p>Authorized! You can close this window.</p></body></html>`);
  } catch {
    res.status(500).send("Authentication failed. Please try again.");
  }
});

router.get("/auth/google/status", (_req, res) => {
  const tokens = loadTokens();
  res.json({ authenticated: !!tokens });
});

router.post("/auth/google/revoke", (_req, res) => {
  try {
    if (fs.existsSync(TOKENS_FILE)) fs.unlinkSync(TOKENS_FILE);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to revoke" });
  }
});

// ── Google Drive ──────────────────────────────────────────────────────────────
router.post("/drive/save", saveToDriveHandler);
router.post("/drive/create-slides", createSlidesHandler);
router.post("/drive/save-slide", saveSlideHandler);

// ── Slides ────────────────────────────────────────────────────────────────────
router.get("/slides/preview/:id", previewSlideHandler);
router.get("/slides/download/:id", downloadSlideHandler);

// ── Google Calendar ───────────────────────────────────────────────────────────
router.post("/calendar/generate-agenda", generateAgendaHandler);
router.post("/calendar/create-event", createEventHandler);
router.get("/calendar/events", listEventsHandler);
router.post("/calendar/send-invites", sendInvitesHandler);

// ── API catch-all ─────────────────────────────────────────────────────────────
router.use((_req, res) => {
  res.status(404).json({ error: "API route not found" });
});

export { router as apiRouter };
