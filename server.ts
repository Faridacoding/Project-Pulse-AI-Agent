import "dotenv/config";
import fs from "fs";
import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { apiRouter } from "./server/routes";
import { NEWSLETTERS_DIR, MAX_JSON_BODY } from "./server/constants";

if (!fs.existsSync(NEWSLETTERS_DIR)) fs.mkdirSync(NEWSLETTERS_DIR, { recursive: true });

async function startServer() {
  const app = express();
  const PORT = 3001;

  app.use(express.json({ limit: MAX_JSON_BODY }));
  app.use("/api", apiRouter);

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }

  app.listen(PORT, "0.0.0.0", () => console.log(`Server running on http://localhost:${PORT}`));
}

startServer();
