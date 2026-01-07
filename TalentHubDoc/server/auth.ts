import { type Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        username: string;
        role: string;
      };
    }
  }
}

// Middleware to check if user is authenticated
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  console.debug('[auth] requireAuth start', { path: req.path, sessionUserId: req.session?.userId });
  if (!req.session?.userId) {
    console.debug('[auth] requireAuth unauthorized');
    res.status(401).json({ message: "unauthorized" });
    return;
  }
  console.debug('[auth] requireAuth ok');
  next();
};

// Middleware to check specific role
export const requireRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    console.debug('[auth] requireRole start', { allowedRoles, path: req.path, sessionUserId: req.session?.userId });
    if (!req.session?.userId) {
      console.debug('[auth] requireRole missing session');
      res.status(401).json({ message: "unauthorized" });
      return;
    }

    try {
      console.debug('[auth] requireRole querying user from db', { userId: req.session.userId });
      if (!db) {
        console.error('[auth] requireRole db not available');
        res.status(500).json({ message: "database not available" });
        return;
      }

      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, req.session.userId));

      if (!result || !result[0]) {
        res.status(401).json({ message: "unauthorized" });
        return;
      }

      if (!allowedRoles.includes(result[0].role)) {
        console.debug('[auth] requireRole forbidden', { userRole: result[0].role });
        res.status(403).json({ message: "forbidden - insufficient permissions" });
        return;
      }

      req.user = {
        id: result[0].id,
        username: result[0].username,
        role: result[0].role,
      };

      console.debug('[auth] requireRole authorized', { user: req.user });
      next();
    } catch (error) {
      console.error('[auth] requireRole error', error);
      res.status(500).json({ message: "auth check error" });
    }
  };
};

// Middleware to attach user to request
export const attachUser = async (req: Request, res: Response, next: NextFunction) => {
  console.debug('[auth] attachUser start', { path: req.path, sessionUserId: req.session?.userId });
  if (!req.session?.userId) {
    console.debug('[auth] attachUser no session');
    return next();
  }

  try {
    if (!db) {
      console.error('[auth] attachUser db not available');
      return next();
    }

    const start = Date.now();
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, req.session.userId));

    const duration = Date.now() - start;
    console.debug('[auth] attachUser db query done', { duration });

    if (result && result.length > 0) {
      req.user = {
        id: result[0].id,
        username: result[0].username,
        role: result[0].role,
      };
      console.debug('[auth] attachUser attached user', { userId: req.user.id });
    }

    next();
  } catch (error) {
    console.error("Error attaching user:", error);
    next();
  }
};
