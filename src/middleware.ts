import { Request, Response, NextFunction, RequestHandler } from "express";
import { chirpyConfig } from "./config.js";
import { filterProfanity, BodyClean } from "./profanity_filter.js";
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, MethodNotAllowedError, ConflictError, UnprocessableEntityError, InternalServerError } from './error_classes.js';
import { NewChirp } from "./schema.js";
import { createChirp } from "./lib/db/queries/chirps.js";

export function middlewareLogResponses(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    const status = res.statusCode;
    if (status >= 400) {
        
        console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${status}`);
    }
  })
  next();
}

export function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
    res.on("finish" , () => { 
    chirpyConfig.apiConfig.fileServerHits += 1;
    })
    next();
}

export async function validateChirp(req: Request, res: Response, next: NextFunction,userId?: string) {
  try {
    if (!req.body.body || typeof req.body.body !== "string") {
      throw new BadRequestError("Request body must have a 'body' field of type string");
    }
    if (!userId) {
      throw new UnauthorizedError("User must be authenticated to post a chirp");
    }
    const parsedBody = req.body.body;
    if (parsedBody.length > 140) {
      throw new BadRequestError("Chirp is too long. Max length is 140")
    }
    const bodyClean: BodyClean = filterProfanity(parsedBody);
    const newChirp: NewChirp = {
      body: bodyClean.body,
      userId: userId,
    };
    const createdChirp = await createChirp(newChirp);
    return res.status(201).json(createdChirp);
  } catch (err) {
    next(err);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.error(err);

  const timestamp = new Date().toISOString();
  const response = (statusCode: number, message: string) => {
    return res.status(statusCode).json({
      error: message,
      timestamp,
      path: req.path
    });
  };

  if (err instanceof BadRequestError) {
    return response(400, err.message);
  }
  if (err instanceof UnauthorizedError) {
    return response(401, err.message);
  }
  if (err instanceof ForbiddenError) {
    return response(403, err.message);
  }
  if (err instanceof NotFoundError) {
    return response(404, err.message);
  }
  if (err instanceof MethodNotAllowedError) {
    return response(405, err.message);
  }
  if (err instanceof ConflictError) {
    return response(409, err.message);
  }
  if (err instanceof UnprocessableEntityError) {
    return response(422, err.message);
  }
  if (err instanceof InternalServerError) {
    return response(500, "Something went wrong on our end");
  }

  return response(500, "Something went wrong on our end");
}

export const asyncHandler = (fn: RequestHandler): RequestHandler =>
  (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimiter(windowMs: number = 60000, maxRequests: number = 100) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const key = `${ip}:${req.path}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetTime) {
      rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
      return next();
    }

    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);
      res.setHeader("Retry-After", retryAfter);
      return res.status(429).json({ error: "Too many requests", retryAfter });
    }

    entry.count++;
    next();
  };
}

const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS?.split(",") || ["http://localhost:8080"];

export function corsMiddleware(req: Request, res: Response, next: NextFunction) {
  const origin = req.get("Origin");

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.setHeader("Access-Control-Allow-Credentials", "true");
  }

  if (req.method === "OPTIONS") {
    return res.status(204).send();
  }

  next();
}

type ValidationRule = {
  field: string;
  type: "string" | "number" | "boolean" | "array" | "object";
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
};

export function validateBody(rules: ValidationRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body;

    for (const rule of rules) {
      const value = body[rule.field];

      if (rule.required && (value === undefined || value === null)) {
        return res.status(400).json({ error: `${rule.field} is required` });
      }

      if (value !== undefined && value !== null) {
        if (typeof value !== rule.type && !(rule.type === "string" && typeof value === "string")) {
          return res.status(400).json({ error: `${rule.field} must be a ${rule.type}` });
        }

        if (rule.type === "string") {
          if (rule.minLength && value.length < rule.minLength) {
            return res.status(400).json({ error: `${rule.field} must be at least ${rule.minLength} characters` });
          }
          if (rule.maxLength && value.length > rule.maxLength) {
            return res.status(400).json({ error: `${rule.field} must be at most ${rule.maxLength} characters` });
          }
          if (rule.pattern && !rule.pattern.test(value)) {
            return res.status(400).json({ error: `${rule.field} has invalid format` });
          }
        }
      }
    }

    next();
  };
}

export interface ApiError {
  error: string;
  message?: string;
  statusCode: number;
  timestamp: string;
  path?: string;
}

export function errorResponse(statusCode: number, error: string, message?: string, path?: string): ApiError {
  return {
    error,
    message,
    statusCode,
    timestamp: new Date().toISOString(),
    path
  };
}
  