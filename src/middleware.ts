import { Request, Response, NextFunction } from "express";
import { chirpyConfig } from "./config.js";
import { filterProfanity, BodyClean } from "./profanity_filter.js";
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, MethodNotAllowedError, ConflictError, UnprocessableEntityError, InternalServerError } from './error_classes.js';

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
        chirpyConfig.fileserverHits += 1;
    })
    next();
}

export async function validateChirp(req: Request, res: Response, next: NextFunction) {
  try {
    const parsedBody = req.body.body;
    if (parsedBody.length > 140) {
      throw new BadRequestError("Chirp is too long")
    }
    const bodyClean: BodyClean = filterProfanity(parsedBody);
    return res.status(200).send({ "cleanedBody": bodyClean.body });
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