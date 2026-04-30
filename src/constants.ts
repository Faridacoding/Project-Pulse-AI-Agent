export const API_ROUTES = {
  UPLOAD_FILE:         "/api/upload-file",
  ANALYZE:             "/api/analyze",
  NEWSLETTERS:         "/api/newsletters",
  NEWSLETTERS_DRAFT:   "/api/newsletters/draft",
  NEWSLETTER_BY_ID:    (id: string) => `/api/newsletters/${id}`,
  GOOGLE_AUTH_URL:     "/api/auth/google/url",
  GOOGLE_AUTH_STATUS:  "/api/auth/google/status",
  GOOGLE_AUTH_REVOKE:  "/api/auth/google/revoke",
  DRIVE_SAVE:          "/api/drive/save",
  DRIVE_CREATE_SLIDES: "/api/drive/create-slides",
  CALENDAR_CREATE:     "/api/calendar/create-event",
  CALENDAR_AGENDA:     "/api/calendar/generate-agenda",
  CALENDAR_EVENTS:     "/api/calendar/events",
  CALENDAR_INVITES:    "/api/calendar/send-invites",
} as const;

export const PRIORITY_COLORS: Record<string, string> = {
  High:   "bg-red-100 text-red-700 border-red-200",
  Medium: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Low:    "bg-green-100 text-green-700 border-green-200",
};

export const STATUS_COLORS: Record<string, string> = {
  "In Progress": "bg-blue-100 text-blue-700",
  "Completed":   "bg-green-100 text-green-700",
  "On Schedule": "bg-teal-100 text-teal-700",
  "Delayed":     "bg-red-100 text-red-700",
};
