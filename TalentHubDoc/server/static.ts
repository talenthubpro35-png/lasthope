import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    console.log(`[static] Public directory not found at ${distPath}, skipping static file serving`);
    // Don't throw, just skip static serving and let API routes handle everything
    return;
  }

  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist
  // BUT: Don't do this for API routes - they should 404 instead
  app.use((req, res, next) => {
    // If it's an API route that wasn't handled, let it 404 properly
    if (req.path.startsWith("/api/")) {
      res.status(404).json({ message: "not found" });
      return;
    }
    // For non-API routes, serve index.html (SPA fallback)
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}


