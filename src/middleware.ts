import { Request, Response, NextFunction } from "express";
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

export async function validateChirp(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.body.body || typeof req.body.body !== "string") {
      throw new BadRequestError("Request body must have a 'body' field of type string");
    }
    if (!req.body.userId || typeof req.body.userId !== "string") {
      throw new UnauthorizedError("User must be authenticated to post a chirp");
    }
    const parsedBody = req.body.body;
    if (parsedBody.length > 140) {
      throw new BadRequestError("Chirp is too long. Max length is 140")
    }
    const bodyClean: BodyClean = filterProfanity(parsedBody);
    const newChirp: NewChirp = {
      body: bodyClean.body,
      userId: req.body.userId,
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
  console.error("Error occured");

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