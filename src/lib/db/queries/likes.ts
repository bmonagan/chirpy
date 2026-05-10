import { db } from "../../db/index.js";
import { likes } from "../../../schema.js";
import { eq, and } from "drizzle-orm";
import { NewLike } from "../../../schema.js";

export async function createLike(like: NewLike) {
  const [result] = await db.insert(likes).values(like).returning();
  return result;
}

export async function deleteLike(userId: string, chirpId: string): Promise<void> {
  await db.delete(likes).where(and(eq(likes.userId, userId), eq(likes.chirpId, chirpId)));
}

export async function getLike(userId: string, chirpId: string) {
  return await db.query.likes.findFirst({
    where: and(eq(likes.userId, userId), eq(likes.chirpId, chirpId)),
  });
}

export async function getLikesByChirp(chirpId: string) {
  return await db.select().from(likes).where(eq(likes.chirpId, chirpId));
}

export async function getLikesByUser(userId: string) {
  return await db.select().from(likes).where(eq(likes.userId, userId));
}

export async function getLikesCountByChirp(chirpId: string): Promise<number> {
  const result = await db.select({ count: likes.id }).from(likes).where(eq(likes.chirpId, chirpId));
  return result.length;
}