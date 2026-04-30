import { useState, useEffect } from "react";
import { getNewsletters, saveNewsletter, deleteNewsletter, draftWeeklyNewsletter } from "./geminiService";
import { DriveButton } from "./DriveButton";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import { useDriveSave } from "./hooks/useDriveSave";
import { newsletterToHtml } from "./utils/newsletterToHtml";
import type { ArchivedNewsletter, Newsletter, AnalysisResult } from "../types";

interface NewsletterViewerProps {
  newsletter: ArchivedNewsletter;
  onClose: () => void;
  driveConnected: boolean;
  onSaveToDrive: () => Promise<void>;
  savingDrive: boolean;
  savedDrive: boolean;
  driveLink?: string;
}

function NewsletterViewer({ newsletter, onClose, driveConnected, onSaveToDrive, savingDrive, savedDrive, driveLink }: NewsletterViewerProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between p-5 border-b border-gray-100">
        <div>
          <p className="text-xs text-gray-500">
            {new Date(newsletter.createdAt).toLocaleDateString("en-US", {
              weekday: "long", year: "numeric", month: "long", day: "numeric",
            })}
          </p>
          <h3 className="font-semibold text-gray-800 mt-0.5">{newsletter.subject}</h3>
        </div>
        <div className="flex items-center gap-2">
          {driveConnected && (
            <DriveButton
              onSave={onSaveToDrive}
              saving={savingDrive}
              saved={savedDrive}
              link={driveLink}
              label="Save to Drive"
            />
          )}
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-700 leading-relaxed">{newsletter.introduction}</p>
        {newsletter.sections.map((section) => (
          <div key={section.heading}>
            <h4 className="text-sm font-semibold text-gray-800 mb-2">{section.heading}</h4>
            <ul className="list-disc list-inside space-y-1">
              {section.items.map((item, i) => (
                <li key={i} className="text-sm text-gray-600">{item}</li>
              ))}
            </ul>
          </div>
        ))}
        <p className="text-sm text-gray-700 leading-relaxed border-t border-gray-100 pt-4">
          {newsletter.conclusion}
        </p>
      </div>
    </div>
  );
}

export default function NewsletterArchive({ latestAnalysis }: { latestAnalysis?: AnalysisResult | null }) {
  const [newsletters, setNewsletters] = useState<ArchivedNewsletter[]>([]);
  const [loading, setLoading] = useState(true);
  const [drafting, setDrafting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [context, setContext] = useState("");
  const [draft, setDraft] = useState<Newsletter | null>(null);
  const [viewing, setViewing] = useState<ArchivedNewsletter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showDraftPanel, setShowDraftPanel] = useState(false);

  const { connected: driveConnected, configured: driveConfigured, connect: connectDrive, disconnect: disconnectDrive } = useGoogleAuth();
  const draftSave = useDriveSave();
  const viewerSave = useDriveSave();

  useEffect(() => {
    loadNewsletters();
  }, []);

  async function loadNewsletters() {
    setLoading(true);
    try {
      const data = await getNewsletters();
      setNewsletters(data);
    } catch {
      setError("Failed to load newsletters.");
    } finally {
      setLoading(false);
    }
  }

  async function handleDraft() {
    setDrafting(true);
    setError(null);
    setDraft(null);
    try {
      const data = await draftWeeklyNewsletter(context || undefined, latestAnalysis ?? undefined);
      setDraft(data);
    } catch {
      setError("Failed to draft newsletter.");
    } finally {
      setDrafting(false);
    }
  }

  async function handleSaveDraft() {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await saveNewsletter(draft);
      setNewsletters([saved, ...newsletters]);
      setDraft(null);
      setContext("");
      setShowDraftPanel(false);
    } catch {
      setError("Failed to save newsletter.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteNewsletter(id);
      setNewsletters(newsletters.filter((n) => n.id !== id));
      if (viewing?.id === id) setViewing(null);
    } catch {
      setError("Failed to delete newsletter.");
    }
  }

  async function saveDraftToDrive() {
    if (!draft) return;
    const date = new Date().toISOString().split("T")[0];
    try {
      await draftSave.save(`Newsletter_${date}`, newsletterToHtml(draft), "text/html", true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save newsletter to Drive.");
    }
  }

  async function saveViewerToDrive() {
    if (!viewing) return;
    const date = new Date().toISOString().split("T")[0];
    try {
      await viewerSave.save(`Newsletter_${date}`, newsletterToHtml(viewing), "text/html", true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save newsletter to Drive.");
    }
  }

  const driveCredentialsMissing = !driveConfigured;

  if (viewing) {
    return (
      <div className="space-y-4">
        <button
          onClick={() => { setViewing(null); viewerSave.reset(); }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Newsletter
        </button>
        <NewsletterViewer
          newsletter={viewing}
          onClose={() => { setViewing(null); viewerSave.reset(); }}
          driveConnected={driveConnected}
          onSaveToDrive={saveViewerToDrive}
          savingDrive={viewerSave.saving}
          savedDrive={viewerSave.saved}
          driveLink={viewerSave.link}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Google Drive connection banner */}
      <div className={`rounded-xl border p-4 flex items-center justify-between gap-4 ${
        driveConnected ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"
      }`}>
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill={driveConnected ? "#16a34a" : "#9ca3af"}>
            <path d="M12.48 2.4l3.6 6.24H4.8L8.4 2.4h4.08zM4.08 10.08L1.2 14.88 4.08 19.2h15.84l2.88-4.32-2.88-4.8H4.08zM16.08 2.4l5.04 8.88H16.08L12.48 5.04 16.08 2.4z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-gray-800">
              {driveConnected ? "Google Drive connected" : "Connect Google Drive"}
            </p>
            <p className="text-xs text-gray-500">
              {driveConnected
                ? "Newsletters can be saved to your Project Pulse folder"
                : driveCredentialsMissing
                ? "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env to enable"
                : "Save newsletters directly to Google Drive"}
            </p>
          </div>
        </div>
        {!driveCredentialsMissing && (
          driveConnected ? (
            <button onClick={disconnectDrive} className="text-xs text-gray-500 hover:text-red-500 transition-colors flex-shrink-0">
              Disconnect
            </button>
          ) : (
            <button onClick={connectDrive} className="text-xs font-medium px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors flex-shrink-0">
              Connect
            </button>
          )
        )}
      </div>

      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Newsletter</h2>
          <p className="text-sm text-gray-500">{newsletters.length} newsletter{newsletters.length !== 1 ? "s" : ""} saved</p>
        </div>
        <button
          onClick={() => { setShowDraftPanel(!showDraftPanel); setDraft(null); setError(null); draftSave.reset(); }}
          className="px-4 py-2 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-colors"
        >
          {showDraftPanel ? "Cancel" : "Draft Newsletter"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {/* Draft panel */}
      {showDraftPanel && (
        <div className="bg-white rounded-2xl border border-violet-200 p-6 shadow-sm space-y-4">
          <h3 className="font-medium text-gray-800">Draft Stakeholder Newsletter</h3>

          {/* Data source indicator */}
          {latestAnalysis ? (
            <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-xl p-3">
              <svg className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-blue-800">Using your latest meeting analysis</p>
                <p className="text-xs text-blue-600 mt-0.5">
                  {latestAnalysis.projects.length} project{latestAnalysis.projects.length !== 1 ? "s" : ""} · {latestAnalysis.highPriorityCount} high priority · {latestAnalysis.completedCount} completed
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-medium text-amber-800">No meeting analysis available</p>
                <p className="text-xs text-amber-600 mt-0.5">
                  Analyze meeting notes first for a data-driven newsletter, or add context below.
                </p>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1.5">
              Additional notes (optional)
            </label>
            <textarea
              className="w-full h-24 text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500"
              placeholder="Add any extra context, highlights, or announcements to include..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
            />
          </div>

          <button
            onClick={handleDraft}
            disabled={drafting || (!latestAnalysis && !context.trim())}
            className="px-5 py-2.5 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {drafting ? "Drafting..." : "Generate Draft"}
          </button>

          {/* Draft preview */}
          {draft && (
            <div className="border border-gray-200 rounded-xl p-5 space-y-3 bg-gray-50">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Subject</p>
                  <p className="font-semibold text-gray-800 mt-0.5">{draft.subject}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {driveConnected && (
                    <DriveButton
                      onSave={saveDraftToDrive}
                      saving={draftSave.saving}
                      saved={draftSave.saved}
                      link={draftSave.link}
                      label="Save to Drive"
                    />
                  )}
                  <button
                    onClick={handleSaveDraft}
                    disabled={saving}
                    className="text-xs font-medium px-3 py-1.5 bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
                  >
                    {saving ? "Saving..." : "Save to Archive"}
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{draft.introduction}</p>
              {draft.sections.map((section) => (
                <div key={section.heading}>
                  <h4 className="text-sm font-semibold text-gray-800 mb-1">{section.heading}</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {section.items.map((item, i) => (
                      <li key={i} className="text-sm text-gray-600">{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
              <p className="text-sm text-gray-700 border-t border-gray-200 pt-3">{draft.conclusion}</p>
            </div>
          )}
        </div>
      )}

      {/* Archive list */}
      {loading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Loading archive...</div>
      ) : newsletters.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-sm">
          <div className="w-14 h-14 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-7 h-7 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">No newsletters archived yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Draft a newsletter to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {newsletters.map((n) => (
            <div
              key={n.id}
              className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-start justify-between gap-4 hover:border-violet-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-xs text-gray-400 mb-0.5">
                  {new Date(n.createdAt).toLocaleDateString("en-US", {
                    weekday: "short", year: "numeric", month: "short", day: "numeric",
                  })}
                </p>
                <p className="font-medium text-gray-800 text-sm truncate">{n.subject}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">{n.introduction}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setViewing(n)}
                  className="text-xs font-medium px-3 py-1.5 border border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  View
                </button>
                <button
                  onClick={() => handleDelete(n.id)}
                  className="text-xs font-medium px-3 py-1.5 border border-red-200 text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
