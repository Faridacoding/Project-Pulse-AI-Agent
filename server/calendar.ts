import fs from "fs";
import { google } from "googleapis";
import type { RequestHandler } from "express";
import { getAuthenticatedClient, AuthError } from "./auth";
import { TOKENS_FILE } from "./constants";
import { runQuery } from "./ai";

export const generateAgendaHandler: RequestHandler = async (req, res) => {
  try {
    const { title, description } = req.body;
    if (!title) return res.status(400).json({ error: "title is required" }) as unknown as void;

    const raw = await runQuery(`You are a professional meeting facilitator. Generate a concise, structured meeting agenda for the following meeting.

Meeting Title: ${title}
${description ? `Description: ${description}` : ""}

Return a plain-text numbered agenda suitable for a meeting invite description.
Include time allocations if the meeting has a clear purpose.
Be practical and specific. Do not use markdown headers. Maximum 200 words.`);

    res.json({ agenda: raw.trim() });
  } catch (error) {
    console.error("Agenda generation error:", error);
    res.status(500).json({ error: "Failed to generate agenda" });
  }
};

export const createEventHandler: RequestHandler = async (req, res) => {
  try {
    const { oauth2Client, tokens } = getAuthenticatedClient();
    const { title, description, date, time, durationMinutes, attendees, timezone, agenda } = req.body;

    if (!title || !date || !time || !durationMinutes) {
      return res.status(400).json({ error: "title, date, time, and durationMinutes are required." }) as unknown as void;
    }

    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const tz = timezone || "UTC";

    // Build local datetime strings (no Z/UTC offset) so Google Calendar interprets
    // them in the user's timezone (tz). Using .toISOString() would produce UTC times
    // that ignore the timeZone field, placing events at the wrong local hour.
    const startDateTimeStr = `${date}T${time}:00`;
    const refDate = new Date(`${date}T${time}:00Z`);
    refDate.setUTCMinutes(refDate.getUTCMinutes() + durationMinutes);
    const endDateTimeStr = refDate.toISOString().slice(0, 19);

    const fullDescription = agenda
      ? `${description}\n\n--- Suggested Agenda ---\n${agenda}`
      : description;

    const event = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: title,
        description: fullDescription || undefined,
        start: { dateTime: startDateTimeStr, timeZone: tz },
        end: { dateTime: endDateTimeStr, timeZone: tz },
        attendees: (attendees as string[] || []).map((email: string) => ({ email })),
        conferenceData: {
          createRequest: {
            requestId: `project-pulse-${Date.now()}`,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      },
    });

    const updated = oauth2Client.credentials;
    if (updated.access_token !== tokens.access_token) {
      const { saveTokens } = await import("./auth");
      saveTokens(updated);
    }

    const meetLink = event.data.conferenceData?.entryPoints?.find(
      (ep) => ep.entryPointType === "video"
    )?.uri;

    res.json({
      success: true,
      eventId: event.data.id,
      eventLink: event.data.htmlLink,
      meetLink: meetLink ?? null,
      title: event.data.summary,
      startTime: event.data.start?.dateTime,
      attendeeResults: [],
    });
  } catch (error: unknown) {
    console.error("Calendar create-event error:", error);
    if (error instanceof AuthError) return res.status(401).json({ error: error.message }) as unknown as void;
    const err = error as { status?: number; code?: number | string; message?: string };
    if (err.status === 401 || err.status === 403) {
      if (fs.existsSync(TOKENS_FILE)) fs.unlinkSync(TOKENS_FILE);
      return res.status(401).json({ error: "Google Calendar session expired or missing permissions. Please reconnect." }) as unknown as void;
    }
    res.status(500).json({ error: `Failed to create calendar event: ${err.message ?? "unknown error"}` });
  }
};

export const listEventsHandler: RequestHandler = async (_req, res) => {
  try {
    const { oauth2Client } = getAuthenticatedClient();
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });
    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: new Date().toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime",
    });
    res.json({ events: response.data.items ?? [] });
  } catch (error: unknown) {
    console.error("Calendar events error:", error);
    if (error instanceof AuthError) return res.status(401).json({ error: error.message }) as unknown as void;
    const err = error as { status?: number; code?: number | string };
    if (err.status === 401 || err.status === 403) {
      if (fs.existsSync(TOKENS_FILE)) fs.unlinkSync(TOKENS_FILE);
      return res.status(401).json({ error: "Session expired." }) as unknown as void;
    }
    res.status(500).json({ error: "Failed to fetch events" });
  }
};
