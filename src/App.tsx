import { useState } from "react";
import MeetingAnalyzer from "./MeetingAnalyzer";
import NewsletterArchive from "./NewsletterArchive";
import ScheduleMeeting from "./ScheduleMeeting";
import type { AnalysisResult } from "../types";

type View = "home" | "analyzer" | "archive" | "schedule";

export default function App() {
  const [view, setView] = useState<View>("home");
  const [latestAnalysis, setLatestAnalysis] = useState<AnalysisResult | null>(null);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4">
        {view !== "home" && (
          <button
            onClick={() => setView("home")}
            className="text-gray-400 hover:text-gray-700 transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold text-gray-900">Project Pulse</h1>
          <p className="text-xs text-gray-400">
            {view === "home" && "AI-powered project management tools"}
            {view === "analyzer" && "Meeting Notes Analyzer"}
            {view === "archive" && "Newsletter"}
            {view === "schedule" && "Schedule Meeting"}
          </p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {view === "home" && (
          <>
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-bold text-gray-800">What would you like to do?</h2>
              <p className="text-gray-500 mt-1 text-sm">Choose a feature to get started</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Meeting Analyzer Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 flex flex-col gap-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">Meeting Notes Analyzer</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Powered by Claude AI</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">
                  Paste your meeting transcript and instantly extract project statuses, progress metrics,
                  and a visual dashboard of all your projects.
                </p>

                <ul className="space-y-1.5">
                  {["Extract project status & progress", "Identify priorities and blockers", "Filter and sort projects", "Export dashboard to slides"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setView("analyzer")}
                  className="mt-auto w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Open Analyzer
                </button>
              </div>

              {/* Newsletter Archive Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 flex flex-col gap-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">Newsletter</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Weekly stakeholder updates</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">
                  Draft, manage, and save stakeholder newsletters. Generate newsletters with AI,
                  keep a full history, and save directly to Google Drive.
                </p>

                <ul className="space-y-1.5">
                  {["Draft newsletters with AI", "Save to Google Drive", "View full newsletter history", "Delete outdated newsletters"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                      <svg className="w-4 h-4 text-violet-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setView("archive")}
                  className="mt-auto w-full py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
                >
                  Open Newsletter
                </button>
              </div>

              {/* Schedule Meeting Card */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-7 flex flex-col gap-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-6 h-6 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800 text-lg">Schedule Meeting</h3>
                    <p className="text-xs text-gray-500 mt-0.5">Google Calendar + Meet</p>
                  </div>
                </div>

                <p className="text-sm text-gray-600 leading-relaxed">
                  Schedule a meeting directly to Google Calendar with a Meet link. Let Claude AI
                  draft a structured agenda based on your meeting goals.
                </p>

                <ul className="space-y-1.5">
                  {["Create Google Calendar events", "Auto-generate Meet link", "AI-drafted meeting agenda", "Invite attendees by email"].map((f) => (
                    <li key={f} className="flex items-center gap-2 text-xs text-gray-600">
                      <svg className="w-4 h-4 text-teal-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => setView("schedule")}
                  className="mt-auto w-full py-2.5 bg-teal-600 text-white text-sm font-medium rounded-xl hover:bg-teal-700 transition-colors"
                >
                  Schedule a Meeting
                </button>
              </div>
            </div>
          </>
        )}

        {view === "analyzer" && (
          <MeetingAnalyzer onAnalysisComplete={setLatestAnalysis} />
        )}

        {view === "archive" && <NewsletterArchive latestAnalysis={latestAnalysis} />}
        {view === "schedule" && <ScheduleMeeting />}
      </main>
    </div>
  );
}
