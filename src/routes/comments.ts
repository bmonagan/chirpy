import { Router } from "express";
import { asyncHandler } from "../middleware.js";
import { requireAuth, Payload } from "../auth.js";
import { BadRequestError, ForbiddenError, NotFoundError } from "../error_classes.js";
import { createComment, getCommentById, getCommentsByChirp, deleteComment } from "../lib/db/queries/comments.js";
import { getChirpById } from "../lib/db/queries/chirps.js";
import { filterProfanity, BodyClean } from "../profanity_filter.js";

const router = Router();

router.post("/:chirpId/comments", requireAuth, asyncHandler(async (req, res) => {
  const chirpId = req.params.chirpId;
  if (typeof chirpId !== "string") {
    throw new BadRequestError("Invalid chirp ID");
  }

  const payload: Payload = res.locals.payload;
  const userID = payload.sub;
  if (!userID) {
    throw new ForbiddenError("Invalid token: missing user ID");
  }

  if (!req.body.body || typeof req.body.body !== "string") {
    throw new BadRequestError("Request body must have a 'body' field of type string");
  }

  const parsedBody = req.body.body;
  if (parsedBody.length > 140) {
    throw new BadRequestError("Comment is too long. Max length is 140");
  }

  const chirp = await getChirpById(chirpId);
  if (!chirp) {
    throw new NotFoundError("Chirp not found");
  }

  const bodyClean: BodyClean = filterProfanity(parsedBody);
  const comment = await createComment({
    body: bodyClean.body,
    userId: userID,
    chirpId
  });

  return res.status(201).json(comment);
}));

router.get("/:chirpId/comments", asyncHandler(async (req, res) => {
  const chirpId = req.params.chirpId;
  if (typeof chirpId !== "string") {
    throw new BadRequestError("Invalid chirp ID");
  }

  const chirp = await getChirpById(chirpId);
  if (!chirp) {
    throw new NotFoundError("Chirp not found");
  }

  const sort = (req.query.sort as string) ?? "asc";
  const comments = await getCommentsByChirp(chirpId, sort);
  return res.status(200).json(comments);
}));

router.delete("/comments/:commentId", requireAuth, asyncHandler(async (req, res) => {
  const commentId = req.params.commentId;
  if (typeof commentId !== "string") {
    throw new BadRequestError("Invalid comment ID");
  }

  const payload: Payload = res.locals.payload;
  const userID = payload.sub;
  if (!userID) {
    throw new ForbiddenError("Invalid token: missing user ID");
  }

  const comment = await getCommentById(commentId);
  if (!comment) {
    throw new NotFoundError("Comment not found");
  }

  if (comment.userId !== userID) {
    throw new ForbiddenError("You can only delete your own comments");
  }

  await deleteComment(commentId);
  return res.status(204).send();
}));

export default router;