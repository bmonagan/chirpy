import { db } from "../../db/index.js";
import { comments } from "../../../schema.js";
import { eq, desc, asc, sql } from "drizzle-orm";
import { NewComment } from "../../../schema.js";

export async function createComment(comment: NewComment) {
  const [result] = await db.insert(comments).values(comment).returning();
  return result;
}

export async function getCommentById(id: string) {
  return await db.query.comments.findFirst({
    where: eq(comments.id, id),
  });
}

export async function getCommentsByChirp(chirpId: string, sort: string = "asc") {
  const orderFn = sort === "desc" ? desc(comments.createdAt) : asc(comments.createdAt);
  return await db.select().from(comments).where(eq(comments.chirpId, chirpId)).orderBy(orderFn);
}

export async function getCommentsByUser(userId: string, sort: string = "asc") {
  const orderFn = sort === "desc" ? desc(comments.createdAt) : asc(comments.createdAt);
  return await db.select().from(comments).where(eq(comments.userId, userId)).orderBy(orderFn);
}

export async function deleteComment(id: string): Promise<void> {
  await db.delete(comments).where(eq(comments.id, id));
}

export async function getCommentsCountByChirp(chirpId: string): Promise<number> {
  const result = await db.select({ count: comments.id }).from(comments).where(eq(comments.chirpId, chirpId));
  return result.length;
}