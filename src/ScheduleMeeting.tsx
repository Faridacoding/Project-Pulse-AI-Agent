import { useState } from "react";
import { createCalendarEvent, generateMeetingAgenda, sendCalendarInvites } from "./geminiService";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import type { CalendarEventResult } from "../types";

export default function ScheduleMeeting() {
  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [attendeeInput, setAttendeeInput] = useState("");
  const [attendees, setAttendees] = useState<string[]>([]);
  const [agenda, setAgenda] = useState("");

  // UI state
  const [generatingAgenda, setGeneratingAgenda] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CalendarEventResult | null>(null);
  const [permissionDeniedEmails, setPermissionDeniedEmails] = useState<string[]>([]);
  const [inviteStatus, setInviteStatus] = useState<{ sent: number; failed: string[]; scopeError?: boolean; error?: string } | null>(null);
  const [sendingInvites, setSendingInvites] = useState(false);
  // Snapshot of attendees at event-creation time so the success screen can show/retry even after form reset
  const [createdAttendees, setCreatedAttendees] = useState<string[]>([]);
  const [createdEventData, setCreatedEventData] = useState<{
    eventId: string; eventLink: string; meetLink?: string | null;
    title: string; description: string; agenda?: string;
    startTime: string; durationMinutes: number;
  } | null>(null);

  const { connected: calendarConnected, configured: calendarConfigured, connect: connectCalendar, disconnect: disconnectCalendar } = useGoogleAuth();

  function addAttendee() {
    const email = attendeeInput.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && emailRegex.test(email) && !attendees.includes(email)) {
      setAttendees([...attendees, email]);
      setAttendeeInput("");
    }
  }

  function removeAttendee(email: string) {
    setAttendees(attendees.filter((a) => a !== email));
  }

  async function handleGenerateAgenda() {
    if (!title.trim()) return;
    setGeneratingAgenda(true);
    setError(null);
    try {
      const { agenda: suggested } = await generateMeetingAgenda(title, description);
      setAgenda(suggested);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to generate agenda.");
    } finally {
      setGeneratingAgenda(false);
    }
  }

  function doSendInvites(
    eventData: {
      eventId: string; eventLink: string; meetLink?: string | null;
      title: string; description: string; agenda?: string;
      startTime: string; durationMinutes: number;
    },
    emailList: string[]
  ) {
    setSendingInvites(true);
    setInviteStatus(null);
    sendCalendarInvites({ ...eventData, attendees: emailList })
      .then((r) => setInviteStatus({ sent: r.sent, failed: r.failed, error: r.error }))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        const smtpNotConfigured = msg.includes("SMTP_NOT_CONFIGURED");
        setInviteStatus({ sent: 0, failed: emailList, scopeError: smtpNotConfigured, error: smtpNotConfigured ? undefined : msg });
      })
      .finally(() => setSendingInvites(false));
  }

  async function handleCreate() {
    if (!title.trim() || !date || !time) return;
    setCreating(true);
    setError(null);
    setPermissionDeniedEmails([]);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const eventResult = await createCalendarEvent({
        title,
        description,
        date,
        time,
        durationMinutes,
        attendees,
        timezone,
        agenda: agenda || undefined,
      });
      setResult(eventResult);
      const denied = (eventResult.attendeeResults ?? [])
        .filter((r) => !r.added)
        .map((r) => r.email);
      if (denied.length > 0) setPermissionDeniedEmails(denied);

      // Snapshot event data so the Resend button can retry without re-creating the event
      const eventData = {
        eventId: eventResult.eventId,
        eventLink: eventResult.eventLink,
        meetLink: eventResult.meetLink,
        title,
        description,
        agenda: agenda || undefined,
        startTime: eventResult.startTime,
        durationMinutes,
      };
      setCreatedAttendees([...attendees]);
      setCreatedEventData(eventData);

      // Send email invitations with ICS attachment to attendees
      if (attendees.length > 0) {
        doSendInvites(eventData, [...attendees]);
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Failed to create event.";
      // Only disconnect for real auth errors returned as 401 from the server.
      // Checking for the exact server message avoids disconnecting on unrelated 500 errors
      // whose text happens to include common auth keywords.
      if (msg.includes("Please reconnect") || msg.includes("Not authenticated")) {
        disconnectCalendar();
      }
      setError(msg);
    } finally {
      setCreating(false);
    }
  }

  function resetForm() {
    setResult(null);
    setTitle("");
    setDescription("");
    setDate("");
    setTime("09:00");
    setDurationMinutes(60);
    setAttendees([]);
    setAttendeeInput("");
    setAgenda("");
    setError(null);
    setPermissionDeniedEmails([]);
    setInviteStatus(null);
    setSendingInvites(false);
    setCreatedAttendees([]);
    setCreatedEventData(null);
  }

  const today = new Date().toISOString().split("T")[0];

  return (
    <div className="space-y-6">
      {/* Permission denied modal */}
      {permissionDeniedEmails.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl p-7 max-w-sm w-full mx-4 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Permissions Not Allowed</h3>
                <p className="text-xs text-gray-500 mt-0.5">Couldn't add event to some calendars</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              The event was created on your calendar, but could not be added directly to the following attendee calendars due to insufficient permissions:
            </p>
            <ul className="space-y-1">
              {permissionDeniedEmails.map((email) => (
                <li key={email} className="flex items-center gap-2 text-sm text-gray-700">
                  <svg className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  {email}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400">They will still receive an email invitation and can add the event to their own calendar by accepting.</p>
            <button
              type="button"
              onClick={() => setPermissionDeniedEmails([])}
              className="w-full py-2.5 bg-gray-800 text-white text-sm font-medium rounded-xl hover:bg-gray-900 transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {/* Google Calendar connection banner */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
        calendarConnected ? "bg-teal-50 border-teal-200" : "bg-gray-50 border-gray-200"
      }`}>
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke={calendarConnected ? "#0d9488" : "#9ca3af"} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {calendarConnected ? "Google Calendar connected" : "Connect Google Calendar"}
            </p>
            <p className="text-xs text-gray-500">
              {calendarConnected
                ? "Events will be created in your primary calendar"
                : !calendarConfigured
                ? "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env to enable"
                : "Connect to create calendar events with Meet links. If you've connected Google Drive before, reconnect to add Calendar access."}
            </p>
          </div>
        </div>
        {calendarConfigured && (
          calendarConnected ? (
            <button type="button" onClick={disconnectCalendar} className="text-xs text-gray-500 hover:text-red-500 transition-colors flex-shrink-0">
              Disconnect
            </button>
          ) : (
            <button type="button" onClick={connectCalendar} className="text-xs font-medium px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
              Connect
            </button>
          )
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Success state */}
      {result ? (
        <div className="bg-white rounded-2xl border border-teal-200 p-8 shadow-sm text-center space-y-5">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-800">{result.title}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {result.startTime
                ? new Date(result.startTime).toLocaleString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })
                : ""}
            </p>
            <p className="text-xs text-gray-400 mt-0.5">Meeting created successfully</p>
          </div>

          {/* Email invite status */}
          {createdAttendees.length > 0 && (
            <div className="text-sm space-y-2">
              {sendingInvites ? (
                <p className="text-gray-400">Sending email invitations...</p>
              ) : inviteStatus ? (
                <>
                  {inviteStatus.sent > 0 && (
                    <p className="text-teal-600">
                      ✓ Email invitation{inviteStatus.sent !== 1 ? "s" : ""} sent to {inviteStatus.sent} attendee{inviteStatus.sent !== 1 ? "s" : ""}
                      {inviteStatus.failed.length > 0 && ` (${inviteStatus.failed.length} failed)`}
                    </p>
                  )}
                  {inviteStatus.sent === 0 && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-left space-y-2">
                      <p className="text-amber-700 text-xs font-medium">
                        {inviteStatus.scopeError
                          ? "Email not configured — add SMTP_USER and SMTP_PASS to your .env file, then restart the server and retry."
                          : "Email invitations could not be sent — check your SMTP credentials in .env."}
                      </p>
                      {createdEventData && (
                        <button
                          type="button"
                          onClick={() => doSendInvites(createdEventData, createdAttendees)}
                          className="text-xs font-medium px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors"
                        >
                          Retry sending invitations
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : null}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={result.eventLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Open in Google Calendar
            </a>
            {result.meetLink && (
              <a
                href={result.meetLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.893L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Join with Google Meet
              </a>
            )}
          </div>
          <button
            type="button"
            onClick={resetForm}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Schedule another meeting
          </button>
        </div>
      ) : (
        /* Meeting Details form */
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <h2 className="font-semibold text-gray-800 mb-5">Meeting Details</h2>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Meeting Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="e.g. Q2 Sprint Planning"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
              <textarea
                className="w-full h-20 text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Purpose of the meeting, topics to cover..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Date + Time */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Date <span className="text-red-400">*</span>
                </label>
                <input
                  type="date"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={date}
                  min={today}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">
                  Time <span className="text-red-400">*</span>
                </label>
                <input
                  type="time"
                  className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                />
              </div>
            </div>

            {/* Duration */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Duration</label>
              <select
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            </div>

            {/* Attendees */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Attendees</label>
              <div className="flex gap-2">
                <input
                  type="email"
                  className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  placeholder="colleague@example.com"
                  value={attendeeInput}
                  onChange={(e) => setAttendeeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addAttendee();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={addAttendee}
                  className="px-3 py-2.5 text-sm bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors"
                >
                  Add
                </button>
              </div>
              {attendees.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {attendees.map((email) => (
                    <span key={email} className="flex items-center gap-1 text-xs bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2.5 py-1">
                      {email}
                      <button
                        type="button"
                        onClick={() => removeAttendee(email)}
                        className="text-teal-400 hover:text-teal-700 transition-colors"
                        aria-label={`Remove ${email}`}
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Agenda */}
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-gray-600">Agenda</label>
                <button
                  type="button"
                  onClick={handleGenerateAgenda}
                  disabled={generatingAgenda || !title.trim()}
                  className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-200 rounded-lg hover:bg-teal-100 disabled:opacity-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                  </svg>
                  {generatingAgenda ? "Generating..." : "Suggest with AI"}
                </button>
              </div>
              <textarea
                className="w-full h-28 text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal-500"
                placeholder="Agenda will appear here after AI suggestion, or type your own..."
                value={agenda}
                onChange={(e) => setAgenda(e.target.value)}
              />
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={handleCreate}
              disabled={creating || !calendarConnected || !title.trim() || !date || !time}
              className="w-full py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? "Creating Event..." : "Create Calendar Event"}
            </button>

            {!calendarConnected && (
              <p className="text-xs text-center text-gray-400">Connect Google Calendar above to create events</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
