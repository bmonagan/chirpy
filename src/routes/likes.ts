import { Router } from "express";
import { asyncHandler } from "../middleware.js";
import { requireAuth, Payload } from "../auth.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../error_classes.js";
import { createLike, deleteLike, getLike, getLikesCountByChirp } from "../lib/db/queries/likes.js";
import { getChirpById } from "../lib/db/queries/chirps.js";

const router = Router();

router.post("/:chirpId/like", requireAuth, asyncHandler(async (req, res) => {
  const chirpId = req.params.chirpId;
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

  const existingLike = await getLike(userID, chirpId);
  if (existingLike) {
    return res.status(200).json({ message: "Chirp already liked" });
  }

  const like = await createLike({ userId: userID, chirpId });
  return res.status(201).json(like);
}));

router.delete("/:chirpId/like", requireAuth, asyncHandler(async (req, res) => {
  const chirpId = req.params.chirpId;
  if (typeof chirpId !== "string") {
    throw new BadRequestError("Invalid chirp ID");
  }

  const payload: Payload = res.locals.payload;
  const userID = payload.sub;
  if (!userID) {
    throw new ForbiddenError("Invalid token: missing user ID");
  }

  const existingLike = await getLike(userID, chirpId);
  if (!existingLike) {
    return res.status(404).json({ message: "Like not found" });
  }

  await deleteLike(userID, chirpId);
  return res.status(204).send();
}));

router.get("/:chirpId/like", asyncHandler(async (req, res) => {
  const chirpId = req.params.chirpId;
  if (typeof chirpId !== "string") {
    throw new BadRequestError("Invalid chirp ID");
  }

  const chirp = await getChirpById(chirpId);
  if (!chirp) {
    throw new NotFoundError("Chirp not found");
  }

  const count = await getLikesCountByChirp(chirpId);
  return res.status(200).json({ count });
}));

export default router;