import { db } from "../../db/index.js";
import { follows } from "../../../schema.js";
import { eq, and } from "drizzle-orm";
import { NewFollow } from "../../../schema.js";

export async function createFollow(follow: NewFollow) {
  const [result] = await db.insert(follows).values(follow).returning();
  return result;
}

export async function deleteFollow(followerId: string, followingId: string): Promise<void> {
  await db.delete(follows).where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
}

export async function getFollow(followerId: string, followingId: string) {
  return await db.query.follows.findFirst({
    where: and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)),
  });
}

export async function getFollowers(userId: string) {
  return await db.select().from(follows).where(eq(follows.followingId, userId));
}

export async function getFollowing(userId: string) {
  return await db.select().from(follows).where(eq(follows.followerId, userId));
}

export async function getFollowersCount(userId: string): Promise<number> {
  const result = await db.select({ count: follows.id }).from(follows).where(eq(follows.followingId, userId));
  return result.length;
}

export async function getFollowingCount(userId: string): Promise<number> {
  const result = await db.select({ count: follows.id }).from(follows).where(eq(follows.followerId, userId));
  return result.length;
}