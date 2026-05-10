import { Router } from "express";
import { asyncHandler, validateChirp } from "../middleware.js";
import { requireAuth, Payload } from "../auth.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../error_classes.js";
import { getChirpById, getChirps, deleteChirpById } from "../lib/db/queries/chirps.js";

const router = Router();

router.post("/", requireAuth, asyncHandler(async (req, res, next) => {
  const payload: Payload = res.locals.payload;
  const userID = payload.sub;
  if (!userID) {
    throw new ForbiddenError("Invalid token: missing user ID");
  }
  await validateChirp(req, res, next, userID);
}));

router.get("/", asyncHandler(async (req, res) => {
  const sort = (req.query.sort as string) ?? "asc";
  if (req.query.authorId) {
    const authorId = req.query.authorId;
    if (typeof authorId !== "string") {
      throw new BadRequestError("Invalid author ID");
    }
    const chirps = await getChirps(authorId, sort);
    return res.status(200).json(chirps);
  }
  const chirps = await getChirps(undefined, sort);
  return res.status(200).json(chirps);
}));

router.get("/:chirpId", asyncHandler(async (req, res) => {
  const chirpId = req.params.chirpId;
  if (!chirpId) {
    throw new BadRequestError("Invalid chirp ID");
  }
  const chirp = await getChirpById(chirpId);
  if (!chirp) {
    return res.status(404).json({ message: "Chirp not found" });
  }
  return res.status(200).json(chirp);
}));

router.delete("/:chirpId", requireAuth, asyncHandler(async (req, res) => {
  const { chirpId } = req.params;
  if (typeof chirpId !== "string") {
    throw new BadRequestError("Invalid chirp ID");
  }

  const payload: Payload = res.locals.payload;
  const userID = payload.sub;
  if (!userID) {
    throw new ForbiddenError("Invalid token: missing user ID");
  }

  const chirp = await getChirpById(chirpId);
  if (!chirp) {
    throw new NotFoundError("Chirp not found");
  }
  if (chirp.userId !== userID) {
    throw new ForbiddenError("Users can only delete their own chirps");
  }

  await deleteChirpById(chirpId);
  return res.status(204).send();
}));

export default router;
