import { useState, useRef, useCallback } from "react";
import { analyzeMeetingNotes, uploadFile, createSlides } from "./geminiService";
import { DriveButton } from "./DriveButton";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import { useDriveSave } from "./hooks/useDriveSave";
import { PRIORITY_COLORS, STATUS_COLORS } from "./constants";
import type { AnalysisResult, Project } from "../types";

function ProjectCard({ project }: { project: Project }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm cursor-pointer hover:ring-2 hover:ring-blue-100 transition-all"
      onClick={() => setExpanded((v) => !v)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <h3 className="font-semibold text-gray-800 text-sm">{project.name}</h3>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${PRIORITY_COLORS[project.priority]}`}>
            {project.priority}
          </span>
          <svg
            className={`w-3.5 h-3.5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[project.status]}`}>
        {project.status}
      </span>
      <div className="mt-3">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{project.progress}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="bg-blue-500 h-2 rounded-full transition-all" style={{ width: `${project.progress}%` }} />
        </div>
      </div>
      <p className="text-xs text-gray-500 mt-2">Due: {project.dueDate}</p>
      {expanded && (
        <p className="text-xs text-gray-600 mt-3 leading-relaxed border-t border-gray-100 pt-3">{project.summary}</p>
      )}
    </div>
  );
}

interface Props {
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

export default function MeetingAnalyzer({ onAnalysisComplete }: Props) {
  const [notes, setNotes] = useState("");
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creatingSlides, setCreatingSlides] = useState(false);
  const [slidePreviewUrl, setSlidePreviewUrl] = useState<string | undefined>();
  const [filterStatus, setFilterStatus] = useState<string>("All");
  const [filterPriority, setFilterPriority] = useState<string>("All");
  const [sortBy, setSortBy] = useState<"default" | "progress-asc" | "progress-desc" | "due">("default");

  const { connected: driveConnected, configured: driveConfigured, connect: connectDrive, disconnect: disconnectDrive } = useGoogleAuth();
  const driveSave = useDriveSave();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── File handling ────────────────────────────────────────────────────────
  async function processFile(file: File) {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["txt", "doc", "docx"].includes(ext ?? "")) {
      setError("Only .txt, .doc, and .docx files are supported.");
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const { text, filename } = await uploadFile(file);
      setNotes(text);
      setUploadedFilename(filename);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to read file.");
    } finally {
      setUploading(false);
    }
  }

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) processFile(file);
  }, []);

  // ── Analysis ─────────────────────────────────────────────────────────────
  async function handleAnalyze() {
    if (!notes.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    driveSave.reset();
    setFilterStatus("All");
    setFilterPriority("All");
    setSortBy("default");
    setSlidePreviewUrl(undefined);
    try {
      const analysisResult = await analyzeMeetingNotes(notes);
      setResult(analysisResult);
      onAnalysisComplete?.(analysisResult);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  // ── Google Slides ─────────────────────────────────────────────────────────
  async function handleCreateSlides() {
    if (!result) return;
    setCreatingSlides(true);
    setError(null);
    try {
      const { previewUrl } = await createSlides(result);
      setSlidePreviewUrl(previewUrl);
      window.open(previewUrl, "_blank", "noopener");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to create slide deck.");
    } finally {
      setCreatingSlides(false);
    }
  }

  async function saveMeetingFileToDrive() {
    if (!notes || !uploadedFilename) return;
    try {
      await driveSave.save(uploadedFilename, notes, "text/plain");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to save file to Drive.");
    }
  }

  const driveCredentialsMissing = !driveConfigured;

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
                ? "Files will be saved to your Project Pulse folder"
                : driveCredentialsMissing
                ? "Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env to enable"
                : "Save meeting files and newsletters directly to Google Drive"}
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

      {/* Input area */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        {/* File upload dropzone */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Upload a file or paste notes below</p>
          <div
            className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
              dragging ? "border-blue-400 bg-blue-50" : "border-gray-200 hover:border-blue-300 hover:bg-gray-50"
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.doc,.docx"
              className="hidden"
              onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
            />
            {uploading ? (
              <p className="text-sm text-blue-600 font-medium">Reading file...</p>
            ) : uploadedFilename ? (
              <div className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm text-green-600 font-medium">{uploadedFilename}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setUploadedFilename(null); setNotes(""); }}
                  className="text-gray-400 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <>
                <svg className="w-8 h-8 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm text-gray-500">Drop a file here or <span className="text-blue-600 font-medium">browse</span></p>
                <p className="text-xs text-gray-400 mt-1">.txt, .doc, .docx — up to 10 MB</p>
              </>
            )}
          </div>
        </div>

        {/* Show Drive save for uploaded file */}
        {uploadedFilename && driveConnected && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">Save original file to Drive:</span>
            <DriveButton
              onSave={saveMeetingFileToDrive}
              saving={driveSave.saving}
              saved={driveSave.saved}
              link={driveSave.link}
              label="Save to Drive"
            />
          </div>
        )}

        {/* Textarea */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1.5">
            {uploadedFilename ? "Extracted text (editable)" : "Or paste meeting notes directly"}
          </label>
          <textarea
            className="w-full h-44 text-sm border border-gray-200 rounded-xl p-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Paste meeting notes here..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <button
          onClick={handleAnalyze}
          disabled={loading || !notes.trim()}
          className="px-6 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Analyzing..." : "Analyze Notes"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
      )}

      {result && (
        <div className="space-y-4">
          {/* Overall status */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Overall Status</p>
            <p className="text-gray-800 text-sm">{result.overallStatus}</p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "High Priority", value: result.highPriorityCount, color: "text-red-600", bg: "bg-red-50" },
              { label: "In Progress", value: result.inProgressCount, color: "text-blue-600", bg: "bg-blue-50" },
              { label: "On Schedule", value: result.onScheduleCount, color: "text-teal-600", bg: "bg-teal-50" },
              { label: "Completed", value: result.completedCount, color: "text-green-600", bg: "bg-green-50" },
            ].map((m) => (
              <div key={m.label} className={`${m.bg} rounded-xl border border-gray-200 p-4 text-center`}>
                <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                <p className="text-xs text-gray-500 mt-1">{m.label}</p>
              </div>
            ))}
          </div>

          {(() => {
            const visibleProjects = result.projects
              .filter((p) => filterStatus === "All" || p.status === filterStatus)
              .filter((p) => filterPriority === "All" || p.priority === filterPriority)
              .sort((a, b) => {
                if (sortBy === "progress-asc") return a.progress - b.progress;
                if (sortBy === "progress-desc") return b.progress - a.progress;
                if (sortBy === "due") return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
                return 0;
              });

            const pillBase = "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors";
            const pillActive = "bg-blue-600 text-white border-blue-600";
            const pillInactive = "bg-white text-gray-600 border-gray-200 hover:border-blue-300";

            return (
              <div className="space-y-4">
                {/* Dashboard actions */}
                <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm">
                  <p className="text-xs text-gray-500 font-medium">Export dashboard</p>
                  <div className="flex items-center gap-2">
                    {slidePreviewUrl ? (
                      <button
                        onClick={() => window.open(slidePreviewUrl, "_blank", "noopener")}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-orange-50 text-orange-700 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Open Slide Deck
                      </button>
                    ) : (
                      <button
                        onClick={handleCreateSlides}
                        disabled={creatingSlides}
                        className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/>
                        </svg>
                        {creatingSlides ? "Creating..." : "Create Slide Deck"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Filter & sort bar */}
                <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 shadow-sm space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium w-14">Status</span>
                    {["All", "In Progress", "On Schedule", "Completed", "Delayed"].map((s) => (
                      <button key={s} onClick={() => setFilterStatus(s)} className={`${pillBase} ${filterStatus === s ? pillActive : pillInactive}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-gray-500 font-medium w-14">Priority</span>
                    {["All", "High", "Medium", "Low"].map((p) => (
                      <button key={p} onClick={() => setFilterPriority(p)} className={`${pillBase} ${filterPriority === p ? pillActive : pillInactive}`}>
                        {p}
                      </button>
                    ))}
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="text-xs text-gray-500">Sort</span>
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="default">Default</option>
                        <option value="progress-desc">Progress ↓</option>
                        <option value="progress-asc">Progress ↑</option>
                        <option value="due">Due Date</option>
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">
                    Showing {visibleProjects.length} of {result.projects.length} projects
                    {visibleProjects.length === 0 && " — no matches"}
                  </p>
                </div>

                {/* Project cards grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleProjects.map((p) => <ProjectCard key={p.name} project={p} />)}
                </div>
              </div>
            );
          })()}

        </div>
      )}
    </div>
  );
}
