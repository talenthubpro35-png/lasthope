// Load environment variables first, before any other imports
import dotenv from "dotenv";
dotenv.config();

// Initialize database connection after env vars are loaded
import { initializeDatabase } from "./db";
initializeDatabase();

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import createMemoryStore from "memorystore";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

app.use(
  express.json({
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

const MemoryStore = createMemoryStore(session);
app.use(
  session({
    store: new MemoryStore({ checkPeriod: 86400000 }),
    secret: process.env.SESSION_SECRET || "dev-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 86400000 },
  }),
);

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  console.log(`[middleware] Incoming request: ${req.method} ${req.path}`);
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  console.log("[init] Starting server initialization...");
  
  try {
    console.log("[init] Calling registerRoutes...");
    await registerRoutes(httpServer, app);
    console.log("[init] registerRoutes completed");
  } catch (err) {
    console.error("[init] registerRoutes failed:", err);
    throw err;
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  console.log("[init] NODE_ENV:", process.env.NODE_ENV);
  if (process.env.NODE_ENV === "production") {
    console.log("[init] Setting up static file serving for production");
    serveStatic(app);
  } else {
    try {
      console.log("[init] Attempting to setup Vite...");
      const { setupVite } = await import("./vite");
      await setupVite(httpServer, app);
      console.log("[init] Vite setup complete");
    } catch (err) {
      console.log("[init] Vite setup failed, using static files:", err);
      serveStatic(app);
    }
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "5000", 10);
  console.log("[init] Starting HTTP server on port", port);
  
  httpServer.on('error', (err: any) => {
    console.error("[init] HTTP Server error:", err);
  });
  
  httpServer.listen(port, () => {
    log(`serving on port ${port}`);
  });
})();
