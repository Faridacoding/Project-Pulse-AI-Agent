import fs from "fs";
import { google } from "googleapis";
import type { GoogleTokens } from "../types";
import { OAUTH_REDIRECT_URI, TOKENS_FILE } from "./constants";

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    OAUTH_REDIRECT_URI
  );
}

export function loadTokens(): GoogleTokens | null {
  try {
    if (fs.existsSync(TOKENS_FILE))
      return JSON.parse(fs.readFileSync(TOKENS_FILE, "utf-8")) as GoogleTokens;
  } catch {}
  return null;
}

export function saveTokens(tokens: GoogleTokens) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

/**
 * Loads tokens, validates expiry, configures and returns a ready OAuth2 client.
 * Throws AuthError (→ 401) if not authenticated or session expired without a refresh token.
 */
export function getAuthenticatedClient(): { oauth2Client: ReturnType<typeof getOAuth2Client>; tokens: GoogleTokens } {
  const tokens = loadTokens();
  if (!tokens) throw new AuthError("Not authenticated with Google.");

  const isExpired = tokens.expiry_date && Date.now() > tokens.expiry_date;
  if (isExpired && !tokens.refresh_token) {
    if (fs.existsSync(TOKENS_FILE)) fs.unlinkSync(TOKENS_FILE);
    throw new AuthError("Google session expired. Please reconnect.");
  }

  const oauth2Client = getOAuth2Client();
  oauth2Client.setCredentials(tokens);
  oauth2Client.on("tokens", (newTokens) => saveTokens({ ...tokens, ...newTokens }));
  return { oauth2Client, tokens };
}
