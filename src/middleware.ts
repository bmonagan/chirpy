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

  if (err instanceof BadRequestError) {
    return res.status(400).json({ error: err.message });
  }
  if (err instanceof UnauthorizedError) {
    return res.status(401).json({ error: err.message });
  }
  if (err instanceof ForbiddenError) {
    return res.status(403).json({ error: err.message });
  }
  if (err instanceof NotFoundError) {
    return res.status(404).json({ error: err.message });
  }
  if (err instanceof MethodNotAllowedError) {
    return res.status(405).json({ error: err.message });
  }
  if (err instanceof ConflictError) {
    return res.status(409).json({ error: err.message });
  }
  if (err instanceof UnprocessableEntityError) {
    return res.status(422).json({ error: err.message });
  }
  if (err instanceof InternalServerError) {
    return res.status(500).json({ error: "Something went wrong on our end" });
  }

  return res.status(500).json({ error: "Something went wrong on our end" });
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
  