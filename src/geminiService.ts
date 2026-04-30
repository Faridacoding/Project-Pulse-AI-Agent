import type { AnalysisResult, Newsletter, ArchivedNewsletter, MeetingEvent, CalendarEventResult, UploadFileResponse, DriveSaveResponse } from "../types";
import { API_ROUTES } from "./constants";

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options);
  const text = await res.text();
  if (!text.trim()) throw new Error(`Server returned empty response (HTTP ${res.status})`);
  const data = JSON.parse(text);
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data as T;
}

export const uploadFile = async (file: File): Promise<UploadFileResponse> => {
  const form = new FormData();
  form.append("file", file);
  return apiFetch<UploadFileResponse>(API_ROUTES.UPLOAD_FILE, { method: "POST", body: form });
};

export const analyzeMeetingNotes = (notes: string) =>
  apiFetch<AnalysisResult>(API_ROUTES.ANALYZE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ notes }),
  });

export const draftWeeklyNewsletter = (context?: string, analysisResult?: AnalysisResult) =>
  apiFetch<Newsletter>(API_ROUTES.NEWSLETTERS_DRAFT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ context, analysisResult }),
  });

export const getNewsletters = () => apiFetch<ArchivedNewsletter[]>(API_ROUTES.NEWSLETTERS);

export const saveNewsletter = (newsletter: Newsletter) =>
  apiFetch<ArchivedNewsletter>(API_ROUTES.NEWSLETTERS, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newsletter),
  });

export const deleteNewsletter = (id: string) =>
  apiFetch<{ success: boolean }>(API_ROUTES.NEWSLETTER_BY_ID(id), { method: "DELETE" });

export const getGoogleAuthUrl = () => apiFetch<{ url: string }>(API_ROUTES.GOOGLE_AUTH_URL);

export const getGoogleAuthStatus = () => apiFetch<{ authenticated: boolean }>(API_ROUTES.GOOGLE_AUTH_STATUS);

export const revokeGoogleAuth = () =>
  apiFetch<{ success: boolean }>(API_ROUTES.GOOGLE_AUTH_REVOKE, { method: "POST" });

export const saveToDrive = (filename: string, content: string, mimeType?: string, asGoogleDoc?: boolean) =>
  apiFetch<DriveSaveResponse>(API_ROUTES.DRIVE_SAVE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename, content, mimeType, asGoogleDoc }),
  });

export const createSlides = (result: AnalysisResult) =>
  apiFetch<{ success: boolean; previewId: string; previewUrl: string }>(API_ROUTES.DRIVE_CREATE_SLIDES, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ result }),
  });

export const createCalendarEvent = (eventData: MeetingEvent) =>
  apiFetch<CalendarEventResult>(API_ROUTES.CALENDAR_CREATE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(eventData),
  });

export const generateMeetingAgenda = (title: string, description: string) =>
  apiFetch<{ agenda: string }>(API_ROUTES.CALENDAR_AGENDA, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title, description }),
  });

export const getCalendarEvents = () =>
  apiFetch<{ events: unknown[] }>(API_ROUTES.CALENDAR_EVENTS);

export const sendCalendarInvites = (data: {
  eventId: string;
  eventLink: string;
  meetLink?: string | null;
  title: string;
  description: string;
  agenda?: string;
  startTime: string;
  durationMinutes: number;
  attendees: string[];
}) =>
  apiFetch<{ success: boolean; sent: number; failed: string[]; error?: string }>(API_ROUTES.CALENDAR_INVITES, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
