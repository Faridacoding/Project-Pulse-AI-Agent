export enum ProjectStatus {
  InProgress = "In Progress",
  Completed = "Completed",
  OnSchedule = "On Schedule",
  Delayed = "Delayed",
}

export enum ProjectPriority {
  High = "High",
  Medium = "Medium",
  Low = "Low",
}

export interface GoogleTokens {
  access_token?: string | null;
  refresh_token?: string | null;
  expiry_date?: number | null;
  token_type?: string | null;
  scope?: string;
}

export interface ApiError {
  error: string;
  message?: string;
}

export interface UploadFileResponse {
  text: string;
  filename: string;
}

export interface DriveSaveResponse {
  success: boolean;
  fileId?: string;
  fileName: string;
  link?: string;
}

export interface Project {
  name: string;
  priority: ProjectPriority;
  status: ProjectStatus;
  progress: number;
  dueDate: string;
  summary: string;
}

export interface NewsletterSection {
  heading: string;
  items: string[];
}

export interface Newsletter {
  subject: string;
  introduction: string;
  sections: NewsletterSection[];
  conclusion: string;
}

export interface ArchivedNewsletter extends Newsletter {
  id: string;
  createdAt: string;
}

export interface AnalysisResult {
  overallStatus: string;
  projects: Project[];
  highPriorityCount: number;
  onScheduleCount: number;
  completedCount: number;
  inProgressCount: number;
  newsletter: Newsletter;
}

export interface MeetingEvent {
  title: string;
  description: string;
  date: string;
  time: string;
  durationMinutes: number;
  attendees: string[];
  timezone: string;
  agenda?: string;
}

export interface AttendeeResult {
  email: string;
  added: boolean;
}

export interface CalendarEventResult {
  success: boolean;
  eventId: string;
  eventLink: string;
  meetLink?: string | null;
  title: string;
  startTime: string;
  attendeeResults: AttendeeResult[];
}
