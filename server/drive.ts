import { Readable } from "stream";
import fs from "fs";
import { google } from "googleapis";
import type { drive_v3 } from "googleapis";
import type { RequestHandler } from "express";
import { getAuthenticatedClient, AuthError } from "./auth";
import { TOKENS_FILE, DRIVE_FOLDER_NAME, PPTX_MIME_TYPE } from "./constants";
import { slidesStore } from "./slides";

async function getOrCreatePulseFolder(drive: drive_v3.Drive): Promise<string> {
  const folderSearch = await drive.files.list({
    q: `name='${DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
  });
  if (folderSearch.data.files && folderSearch.data.files.length > 0) {
    return folderSearch.data.files[0].id!;
  }
  const folder = await drive.files.create({
    requestBody: { name: DRIVE_FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
    fields: "id",
  });
  return folder.data.id!;
}

export const saveToDriveHandler: RequestHandler = async (req, res) => {
  try {
    const { oauth2Client, tokens } = getAuthenticatedClient();
    const { filename, content, mimeType = "text/plain", asGoogleDoc = false } = req.body;

    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const folderId = await getOrCreatePulseFolder(drive);

    const fileStream = Readable.from([Buffer.from(content, "utf-8")]);
    const requestBody: { name: string; parents: string[]; mimeType?: string } = { name: filename, parents: [folderId] };
    if (asGoogleDoc) requestBody.mimeType = "application/vnd.google-apps.document";
    const file = await drive.files.create({
      requestBody,
      media: { mimeType, body: fileStream },
      fields: "id, name, webViewLink",
    });

    const updated = oauth2Client.credentials;
    if (updated.access_token !== tokens.access_token) {
      const { saveTokens } = await import("./auth");
      saveTokens(updated);
    }

    res.json({ success: true, fileId: file.data.id, fileName: file.data.name, link: file.data.webViewLink });
  } catch (error: unknown) {
    console.error("Drive save error:", error);
    if (error instanceof AuthError) return res.status(401).json({ error: error.message }) as unknown as void;
    const err = error as { code?: number };
    if (err.code === 401) {
      if (fs.existsSync(TOKENS_FILE)) fs.unlinkSync(TOKENS_FILE);
      return res.status(401).json({ error: "Google Drive session expired. Please reconnect." }) as unknown as void;
    }
    res.status(500).json({ error: "Failed to save to Google Drive" });
  }
};

export const saveSlideHandler: RequestHandler = async (req, res) => {
  try {
    const { previewId } = req.body as { previewId: string };
    if (!previewId) return res.status(400).json({ error: "previewId is required" }) as unknown as void;

    const entry = slidesStore.get(previewId);
    if (!entry) return res.status(404).json({ error: "Slide deck not found or already downloaded/expired. Please regenerate." }) as unknown as void;

    const { oauth2Client } = getAuthenticatedClient();
    const drive = google.drive({ version: "v3", auth: oauth2Client });
    const folderId = await getOrCreatePulseFolder(drive);

    const date = new Date().toISOString().split("T")[0];
    const fileStream = Readable.from([entry.buffer]);
    const file = await drive.files.create({
      requestBody: { name: `Project-Status-Report_${date}.pptx`, parents: [folderId] },
      media: { mimeType: PPTX_MIME_TYPE, body: fileStream },
      fields: "id, webViewLink",
    });

    slidesStore.delete(previewId);
    res.json({ success: true, link: file.data.webViewLink });
  } catch (error: unknown) {
    console.error("Save slide error:", error);
    if (error instanceof AuthError) return res.status(401).json({ error: error.message }) as unknown as void;
    const err = error as { code?: number; message?: string };
    if (err.code === 401 || err.code === 403) {
      if (fs.existsSync(TOKENS_FILE)) fs.unlinkSync(TOKENS_FILE);
      return res.status(401).json({ error: "Google Drive session expired or missing permissions. Please reconnect." }) as unknown as void;
    }
    res.status(500).json({ error: `Failed to save to Drive: ${err.message ?? "unknown error"}` });
  }
};
