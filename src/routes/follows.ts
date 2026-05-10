import { Router } from "express";
import { asyncHandler } from "../middleware.js";
import { requireAuth, Payload } from "../auth.js";
import { BadRequestError, ForbiddenError, NotFoundError, ConflictError } from "../error_classes.js";
import { createFollow, deleteFollow, getFollow, getFollowers, getFollowing, getFollowersCount, getFollowingCount } from "../lib/db/queries/follows.js";
import { getUserById } from "../lib/db/queries/users.js";

const router = Router();

router.post("/:userId/follow", requireAuth, asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId;
  if (typeof targetUserId !== "string") {
    throw new BadRequestError("Invalid user ID");
  }

  const payload: Payload = res.locals.payload;
  const userID = payload.sub;
  if (!userID) {
    throw new ForbiddenError("Invalid token: missing user ID");
  }

  const targetUser = await getUserById(targetUserId);
  if (!targetUser) {
    throw new NotFoundError("User not found");
  }

  if (userID === targetUserId) {
    throw new BadRequestError("Cannot follow yourself");
  }

  const existingFollow = await getFollow(userID, targetUserId);
  if (existingFollow) {
    throw new ConflictError("Already following this user");
  }

  const follow = await createFollow({ followerId: userID, followingId: targetUserId });
  return res.status(201).json(follow);
}));

router.delete("/:userId/follow", requireAuth, asyncHandler(async (req, res) => {
  const targetUserId = req.params.userId;
  if (typeof targetUserId !== "string") {
    throw new BadRequestError("Invalid user ID");
  }

  const payload: Payload = res.locals.payload;
  const userID = payload.sub;
  if (!userID) {
    throw new ForbiddenError("Invalid token: missing user ID");
  }

  const existingFollow = await getFollow(userID, targetUserId);
  if (!existingFollow) {
    throw new NotFoundError("Not following this user");
  }

  await deleteFollow(userID, targetUserId);
  return res.status(204).send();
}));

router.get("/:userId/followers", asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  if (typeof userId !== "string") {
    throw new BadRequestError("Invalid user ID");
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const followers = await getFollowers(userId);
  const count = await getFollowersCount(userId);
  return res.status(200).json({ followers, count });
}));

router.get("/:userId/following", asyncHandler(async (req, res) => {
  const userId = req.params.userId;
  if (typeof userId !== "string") {
    throw new BadRequestError("Invalid user ID");
  }

  const user = await getUserById(userId);
  if (!user) {
    throw new NotFoundError("User not found");
  }

  const following = await getFollowing(userId);
  const count = await getFollowingCount(userId);
  return res.status(200).json({ following, count });
}));

export default router;