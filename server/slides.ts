import _PptxGenJS from "pptxgenjs";
import type { RequestHandler } from "express";
import { SLIDES_TTL_MS, SLIDES_CLEANUP_INTERVAL_MS } from "./constants";

// Handle CJS/ESM interop — pptxgenjs exports via module.exports which lands on .default in ESM
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PptxGenJS = (_PptxGenJS as any).default ?? _PptxGenJS;

// ── Slide color maps ──────────────────────────────────────────────────────────
const statusBgHex: Record<string, string> = {
  "Completed":   "E8F5E9",
  "On Schedule": "E0F7FA",
  "In Progress": "E3F2FD",
  "Delayed":     "FCE4EC",
};
const statusAccentHex: Record<string, string> = {
  "Completed":   "2E7D32",
  "On Schedule": "00838F",
  "In Progress": "1565C0",
  "Delayed":     "C62828",
};
const priorityColor: Record<string, string> = {
  High: "C62828", Medium: "E65100", Low: "2E7D32",
};

// ── In-memory slides store (TTL safety net) ───────────────────────────────────
export const slidesStore = new Map<string, { buffer: Buffer; createdAt: number }>();
setInterval(() => {
  const cutoff = Date.now() - SLIDES_TTL_MS;
  for (const [id, entry] of slidesStore) {
    if (entry.createdAt < cutoff) slidesStore.delete(id);
  }
}, SLIDES_CLEANUP_INTERVAL_MS);

// ── Private slide builders ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildTitleSlide(pptx: any, result: any, date: string, W: number) {
  const s0 = pptx.addSlide();
  s0.background = { color: "1A3A6B" };
  s0.addText("Weekly Project Status Report", {
    x: 1, y: 2.0, w: W - 2, h: 1.2,
    fontSize: 40, bold: true, color: "FFFFFF", align: "center",
  });
  s0.addText(date, {
    x: 1, y: 3.4, w: W - 2, h: 0.55,
    fontSize: 18, color: "BDD0FF", align: "center",
  });
  s0.addText(String(result.overallStatus ?? ""), {
    x: 1.5, y: 4.1, w: W - 3, h: 0.5,
    fontSize: 13, color: "7FA8D4", align: "center", italic: true,
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildPortfolioSlide(pptx: any, result: any, W: number) {
  const s1 = pptx.addSlide();
  s1.background = { color: "F8F9FA" };
  s1.addText("Portfolio Overview", {
    x: 0.5, y: 0.35, w: W - 1, h: 0.7,
    fontSize: 28, bold: true, color: "1A237E",
  });
  s1.addText(String(result.overallStatus ?? ""), {
    x: 0.5, y: 1.1, w: W - 1, h: 0.4,
    fontSize: 13, color: "555555",
  });

  const stats = [
    { label: "High Priority",  value: result.highPriorityCount,  bg: "FFEBEE", fg: "C62828" },
    { label: "In Progress",    value: result.inProgressCount,    bg: "E3F2FD", fg: "1565C0" },
    { label: "On Schedule",    value: result.onScheduleCount,    bg: "E0F7FA", fg: "00838F" },
    { label: "Completed",      value: result.completedCount,     bg: "E8F5E9", fg: "2E7D32" },
  ];
  const boxW = 2.8, boxH = 2.2, gap = 0.2;
  const totalW = stats.length * boxW + (stats.length - 1) * gap;
  const startX = (W - totalW) / 2;
  stats.forEach((st, i) => {
    const bx = startX + i * (boxW + gap);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    s1.addShape(pptx.ShapeType.roundRect as any, {
      x: bx, y: 1.8, w: boxW, h: boxH,
      fill: { color: st.bg }, line: { color: st.bg },
      rectRadius: 0.12,
    });
    s1.addText(String(st.value ?? 0), {
      x: bx, y: 2.15, w: boxW, h: 0.8,
      fontSize: 44, bold: true, color: st.fg, align: "center",
    });
    s1.addText(st.label, {
      x: bx, y: 3.1, w: boxW, h: 0.4,
      fontSize: 13, color: "555555", align: "center",
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function buildProjectSlide(pptx: any, p: any, W: number) {
  const bg  = statusBgHex[p.status]     ?? "F5F5F5";
  const ac  = statusAccentHex[p.status] ?? "333333";
  const pc  = priorityColor[p.priority] ?? "555555";
  const pct = Math.min(100, Math.max(0, p.progress ?? 0)) / 100;

  const sp = pptx.addSlide();
  sp.background = { color: bg };

  sp.addText(String(p.name ?? ""), {
    x: 0.5, y: 0.35, w: W - 2.5, h: 0.7,
    fontSize: 26, bold: true, color: "1A237E",
  });
  sp.addText(`${p.priority} Priority`, {
    x: W - 2.3, y: 0.35, w: 1.8, h: 0.45,
    fontSize: 12, bold: true, color: pc, align: "right",
  });
  sp.addText(String(p.status ?? ""), {
    x: 0.5, y: 1.15, w: 2.5, h: 0.38,
    fontSize: 13, bold: true, color: "FFFFFF",
    fill: { color: ac }, align: "center",
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sp.addShape(pptx.ShapeType.rect as any, {
    x: 0.5, y: 1.75, w: W - 1, h: 0.18,
    fill: { color: "CCCCCC" }, line: { color: "CCCCCC" },
  });
  if (pct > 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sp.addShape(pptx.ShapeType.rect as any, {
      x: 0.5, y: 1.75, w: (W - 1) * pct, h: 0.18,
      fill: { color: ac }, line: { color: ac },
    });
  }
  sp.addText(`${Math.round(pct * 100)}% complete`, {
    x: 0.5, y: 2.0, w: W - 1, h: 0.35,
    fontSize: 11, color: "666666", align: "right",
  });
  sp.addText(`Due: ${p.dueDate ?? ""}`, {
    x: 0.5, y: 2.45, w: W - 1, h: 0.38,
    fontSize: 13, color: "444444",
  });
  sp.addText(String(p.summary ?? ""), {
    x: 0.5, y: 3.0, w: W - 1, h: 3.8,
    fontSize: 13, color: "333333", wrap: true, valign: "top",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generatePptx(result: any, date: string): Promise<Buffer> {
  const W = 13.33; // LAYOUT_WIDE width (inches)
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";

  buildTitleSlide(pptx, result, date, W);
  buildPortfolioSlide(pptx, result, W);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const p of (result.projects ?? [])) {
    buildProjectSlide(pptx, p, W);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const output = await (pptx as any).stream();
  return Buffer.isBuffer(output) ? output : Buffer.from(output as ArrayBuffer);
}

export function buildPreviewPageHtml(id: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Slide Deck Ready — Project Pulse</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f0f4ff;min-height:100vh;display:flex;align-items:center;justify-content:center}
  .card{background:#fff;border-radius:16px;padding:48px 56px;box-shadow:0 4px 24px rgba(0,0,0,.08);max-width:480px;width:100%;text-align:center}
  .icon{font-size:3em;margin-bottom:0.4em}
  h1{font-size:1.5em;color:#1a237e;margin-bottom:0.5em}
  p{color:#555;font-size:0.95em;line-height:1.6;margin-bottom:1.5em}
  .btn{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;border:none;text-decoration:none;transition:opacity .15s;width:100%;justify-content:center;margin-bottom:10px}
  .btn:hover{opacity:.85}
  .btn-dl{background:#1a3a6b;color:#fff}
  .btn-drive{background:#fff;color:#333;border:1.5px solid #ddd}
  .btn-saved{background:#e8f5e9;color:#2e7d32;border:1.5px solid #c8e6c9;pointer-events:none}
  .note{font-size:0.82em;color:#888;margin-top:1em}
</style>
</head>
<body>
<div class="card">
  <div class="icon">📊</div>
  <h1>Slide deck ready!</h1>
  <p>Click <strong>Download .pptx</strong> to save the file, or save it directly to Google Drive.</p>
  <a href="/api/slides/download/${id}" class="btn btn-dl" id="dl-btn">⬇ Download .pptx</a>
  <button id="save-btn" class="btn btn-drive" onclick="saveToDrive()">☁ Save to Drive</button>
  <p class="note">Memory is freed after saving to Drive. Slide deck expires in 1 hour.</p>
</div>
<script>
  async function saveToDrive() {
    const btn = document.getElementById('save-btn');
    btn.textContent = 'Saving…'; btn.disabled = true;
    try {
      const r = await fetch('/api/drive/save-slide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ previewId: '${id}' })
      });
      const d = await r.json();
      if (r.ok && d.success) {
        btn.className = 'btn btn-saved';
        btn.textContent = '✓ Saved to Drive';
        if (d.link) setTimeout(() => window.open(d.link, '_blank'), 400);
      } else if (r.status === 401) {
        btn.textContent = '☁ Save to Drive'; btn.disabled = false;
        alert('Please connect Google Drive in the main Project Pulse window first, then try again.');
      } else {
        btn.textContent = '☁ Save to Drive'; btn.disabled = false;
        alert('Save failed: ' + (d.error || 'Unknown error'));
      }
    } catch (e) {
      btn.textContent = '☁ Save to Drive'; btn.disabled = false;
      alert('Error: ' + e.message);
    }
  }
</script>
</body>
</html>`;
}

export const createSlidesHandler: RequestHandler = async (req, res) => {
  try {
    const { result } = req.body;
    if (!result) return res.status(400).json({ error: "result is required" }) as unknown as void;
    const date = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });
    const previewId = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const buffer = await generatePptx(result, date);
    slidesStore.set(previewId, { buffer, createdAt: Date.now() });
    res.json({ success: true, previewId, previewUrl: `/api/slides/preview/${previewId}` });
  } catch (error: unknown) {
    console.error("Create slides error:", error);
    res.status(500).json({ error: "Failed to generate slide deck" });
  }
};

export const previewSlideHandler: RequestHandler = (req, res) => {
  const { id } = req.params;
  const entry = slidesStore.get(id);
  if (!entry) {
    res.status(404).send(`<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Slide Deck Expired</title></head><body style="font-family:sans-serif;text-align:center;padding:60px;background:#f8f9fa">
<h2 style="color:#c62828">Slide deck not found or expired</h2>
<p style="color:#555;margin-top:1em">Please go back and click <strong>Create Slide Deck</strong> again.</p>
</body></html>`);
    return;
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(buildPreviewPageHtml(id));
};

export const downloadSlideHandler: RequestHandler = (req, res) => {
  const entry = slidesStore.get(req.params.id);
  if (!entry) return res.status(404).send("Slide deck not found or already downloaded.") as unknown as void;
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.presentationml.presentation");
  res.setHeader("Content-Disposition", 'attachment; filename="project-status-report.pptx"');
  res.send(entry.buffer);
};
