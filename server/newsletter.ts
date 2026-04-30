import path from "path";
import fsPromises from "fs/promises";
import type { RequestHandler } from "express";
import { runQuery, extractJson } from "./ai";
import { NEWSLETTERS_DIR } from "./constants";

export const getNewslettersHandler: RequestHandler = async (_req, res) => {
  try {
    const files = await fsPromises.readdir(NEWSLETTERS_DIR);
    const newsletters = await Promise.all(
      files.filter((f) => f.endsWith(".json")).map(async (f) => {
        const c = await fsPromises.readFile(path.join(NEWSLETTERS_DIR, f), "utf-8");
        return JSON.parse(c);
      })
    );
    newsletters.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(newsletters);
  } catch {
    res.status(500).json({ error: "Failed to load newsletters" });
  }
};

export const saveNewsletterHandler: RequestHandler = async (req, res) => {
  try {
    const id = Date.now().toString();
    const entry = { id, createdAt: new Date().toISOString(), ...req.body };
    await fsPromises.writeFile(path.join(NEWSLETTERS_DIR, `${id}.json`), JSON.stringify(entry, null, 2));
    res.json(entry);
  } catch {
    res.status(500).json({ error: "Failed to save newsletter" });
  }
};

export const deleteNewsletterHandler: RequestHandler = async (req, res) => {
  try {
    await fsPromises.unlink(path.join(NEWSLETTERS_DIR, `${req.params.id}.json`));
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: "Failed to delete newsletter" });
  }
};

export const draftNewsletterHandler: RequestHandler = async (req, res) => {
  try {
    const { context, analysisResult } = req.body;

    let dataSection = "";
    if (analysisResult) {
      const { overallStatus, projects = [], highPriorityCount, inProgressCount, onScheduleCount, completedCount } = analysisResult;
      const projectLines = projects.map((p: { name: string; status: string; progress: number; priority: string; dueDate: string; summary: string }) =>
        `  - ${p.name} [${p.priority} priority | ${p.status} | ${p.progress}% complete | Due: ${p.dueDate}]\n    ${p.summary}`
      ).join("\n");

      dataSection = `
Meeting Analysis Data:
Overall Status: ${overallStatus}
Metrics: ${highPriorityCount} high priority, ${inProgressCount} in progress, ${onScheduleCount} on schedule, ${completedCount} completed

Projects:
${projectLines}
${context ? `\nAdditional notes from the team:\n${context}` : ""}`;
    } else if (context) {
      dataSection = `\nContext/Updates:\n${context}`;
    }

    const raw = await runQuery(`You are a project management assistant. Draft a professional stakeholder email newsletter.
${analysisResult
  ? `Use the following real meeting analysis data to write a specific, informative update:${dataSection}`
  : dataSection
    ? `Use this context to draft a professional project status newsletter:${dataSection}`
    : "Draft a professional weekly project status newsletter for stakeholders."}

Write the email in a clear, professional tone suitable for executive stakeholders. Be specific — reference actual project names, statuses, and progress where data is available. Do not fabricate details not present in the data.

Return ONLY a valid JSON object:
{
  "subject": "string",
  "introduction": "string",
  "sections": [{ "heading": "string", "items": ["string"] }],
  "conclusion": "string"
}`);
    res.json(JSON.parse(extractJson(raw)));
  } catch (error) {
    console.error("Draft error:", error);
    res.status(500).json({ error: "Failed to draft newsletter" });
  }
};

export const analyzeMeetingNotesHandler: RequestHandler = async (req, res) => {
  try {
    const { notes } = req.body;
    if (!notes) return res.status(400).json({ error: "Notes are required" }) as unknown as void;

    const raw = await runQuery(`You are a project management assistant. Analyze the following meeting notes and extract project progress information.
Identify high priority projects, their current status (In Progress, Completed, On Schedule, Delayed),
progress percentage (0-100), due dates, and a brief summary for each.
Also, generate a professional draft newsletter for stakeholders based on this analysis.

Return ONLY a valid JSON object with no additional text, using this exact structure:
{
  "overallStatus": "string",
  "projects": [
    {
      "name": "string",
      "priority": "High" | "Medium" | "Low",
      "status": "In Progress" | "Completed" | "On Schedule" | "Delayed",
      "progress": number,
      "dueDate": "string",
      "summary": "string"
    }
  ],
  "highPriorityCount": number,
  "onScheduleCount": number,
  "completedCount": number,
  "inProgressCount": number,
  "newsletter": {
    "subject": "string",
    "introduction": "string",
    "sections": [{ "heading": "string", "items": ["string"] }],
    "conclusion": "string"
  }
}

Meeting Notes:
${notes}`);

    res.json(JSON.parse(extractJson(raw)));
  } catch (error) {
    console.error("Analyze error:", error);
    res.status(500).json({ error: "Failed to analyze notes" });
  }
};
