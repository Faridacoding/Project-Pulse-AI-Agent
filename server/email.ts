import type { RequestHandler } from "express";
import nodemailer from "nodemailer";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function generateIcsContent(params: {
  uid: string;
  title: string;
  description: string;
  startIso: string;
  durationMinutes: number;
  attendees: string[];
  meetLink?: string | null;
  agenda?: string;
  organizer?: string;
}): string {
  const start = new Date(params.startIso);
  const end = new Date(start.getTime() + params.durationMinutes * 60000);
  const toIcsUtc = (d: Date) => d.toISOString().replace(/[-:.]/g, "").slice(0, 15) + "Z";
  const esc = (s: string) =>
    s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n").replace(/\r/g, "");
  const fullDesc = params.agenda
    ? `${params.description || ""}\n\n--- Agenda ---\n${params.agenda}`
    : (params.description || "");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Project Pulse//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${params.uid}@google.com`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    ...(params.organizer ? [`ORGANIZER;CN=Meeting Organizer:mailto:${params.organizer}`] : []),
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${esc(params.title)}`,
    ...(fullDesc ? [`DESCRIPTION:${esc(fullDesc)}`] : []),
    ...(params.meetLink ? [`LOCATION:${esc(params.meetLink)}`] : []),
    ...params.attendees.map((e) => `ATTENDEE;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${e}`),
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function buildInviteEmailHtml(params: {
  title: string;
  formattedStart: string;
  meetLink?: string | null;
  eventLink: string;
  agenda?: string;
  description?: string;
}): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
  <div style="border-left:4px solid #0d9488;padding-left:16px;margin-bottom:20px;">
    <h2 style="margin:0 0 4px;color:#1a3a6b;font-size:22px;">${escapeHtml(params.title)}</h2>
    <p style="margin:0;color:#555;font-size:14px;">&#x1F4C5; ${escapeHtml(params.formattedStart)}</p>
  </div>
  ${params.description ? `<p style="color:#555;font-size:14px;margin-bottom:16px;">${escapeHtml(params.description)}</p>` : ""}
  ${params.agenda ? `<div style="background:#f0fdf4;border-radius:8px;padding:12px 16px;margin-bottom:20px;"><h4 style="margin:0 0 8px;color:#0d9488;font-size:12px;text-transform:uppercase;letter-spacing:0.5px;">Agenda</h4><pre style="margin:0;font-size:13px;color:#444;white-space:pre-wrap;font-family:Arial,sans-serif;">${escapeHtml(params.agenda)}</pre></div>` : ""}
  <div style="margin-bottom:24px;">
    <a href="${escapeHtml(params.eventLink)}" style="display:inline-block;background:#4285F4;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;margin-right:10px;">Open in Google Calendar</a>
    ${params.meetLink ? `<a href="${escapeHtml(params.meetLink)}" style="display:inline-block;background:#0d9488;color:white;padding:10px 20px;border-radius:6px;text-decoration:none;font-size:14px;font-weight:bold;">Join Google Meet</a>` : ""}
  </div>
  <p style="color:#888;font-size:12px;border-top:1px solid #eee;padding-top:16px;">
    An <strong>.ics calendar file</strong> is attached to this email. Open it to add this event to Apple Calendar, Outlook, or any other calendar app.
  </p>
  <p style="color:#bbb;font-size:11px;margin-top:8px;">Sent via Project Pulse</p>
</body>
</html>`;
}

export const sendInvitesHandler: RequestHandler = async (req, res) => {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) {
    return res.status(503).json({
      error: "SMTP_NOT_CONFIGURED",
      message: "Add SMTP_USER and SMTP_PASS to your .env file to enable email invitations.",
    }) as unknown as void;
  }

  try {
    const { eventId, eventLink, meetLink, title, description, agenda, startTime, durationMinutes, attendees } =
      req.body as {
        eventId: string;
        eventLink: string;
        meetLink?: string | null;
        title: string;
        description: string;
        agenda?: string;
        startTime: string;
        durationMinutes: number;
        attendees: string[];
      };

    if (!title || !startTime || !Array.isArray(attendees) || attendees.length === 0) {
      return res.status(400).json({ error: "title, startTime, and attendees are required." }) as unknown as void;
    }

    const icsContent = generateIcsContent({
      uid: eventId || `pp-${Date.now()}`,
      title,
      description: description || "",
      startIso: startTime,
      durationMinutes,
      attendees,
      meetLink,
      agenda,
      organizer: smtpUser,
    });

    const start = new Date(startTime);
    const formattedStart = start.toLocaleString("en-US", {
      weekday: "long", month: "long", day: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    });

    const html = buildInviteEmailHtml({ title, formattedStart, meetLink, eventLink, agenda, description });

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.verify().catch(() => {
      throw new Error("SMTP_AUTH_FAILED");
    });

    const results = await Promise.allSettled(
      attendees.map((to: string) =>
        transporter.sendMail({
          from: `"Project Pulse" <${smtpUser}>`,
          to,
          subject: `You're invited: ${title}`,
          html,
          attachments: [
            {
              filename: "invite.ics",
              content: icsContent,
              contentType: "text/calendar; method=REQUEST",
            },
          ],
        })
      )
    );

    const failed: string[] = [];
    let firstError: string | undefined;
    results.forEach((r, i) => {
      if (r.status === "rejected") {
        failed.push(attendees[i]);
        if (!firstError) firstError = (r.reason as { message?: string })?.message ?? String(r.reason);
        console.error(`Failed to send invite to ${attendees[i]}:`, r.reason);
      }
    });

    res.json({ success: failed.length < attendees.length, sent: attendees.length - failed.length, failed, error: firstError });
  } catch (error: unknown) {
    console.error("Send invites error:", error);
    const err = error as { message?: string };
    res.status(500).json({ error: `Failed to send invitation emails: ${err.message ?? "unknown error"}` });
  }
};
