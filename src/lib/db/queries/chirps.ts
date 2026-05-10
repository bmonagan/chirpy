import { db } from "../../db/index.js";
import { NewChirp, chirps } from "../../../schema.js";
import { asc, eq, desc } from "drizzle-orm";

export async function createChirp(chirp: NewChirp) {
  const [result] = await db
    .insert(chirps)
    .values(chirp)
    .returning();
  return result;
}

export async function getChirps(userId?: string, sort: string = "asc", limit: number = 100, offset: number = 0) {
  if (sort !== "asc" && sort !== "desc") {
    throw new Error("Invalid sort order");
  }

  const orderFn = sort === "asc" ? asc(chirps.createdAt) : desc(chirps.createdAt);

  if (userId) {
    return await db.select().from(chirps).where(eq(chirps.userId, userId)).orderBy(orderFn).limit(limit).offset(offset);
  }
  return await db.select().from(chirps).orderBy(orderFn).limit(limit).offset(offset);
}

export async function getChirpById(id: string): Promise<typeof chirps.$inferSelect | null> {
  const chirp = await db.query.chirps.findFirst({
    where: eq(chirps.id, id),
  });
  return chirp ?? null;
}

export async function deleteChirpById(id: string): Promise<void> {
  await db.delete(chirps).where(eq(chirps.id, id));
}

export async function getChirpsCount(userId?: string): Promise<number> {
  if (userId) {
    const result = await db.select({ count: chirps.id }).from(chirps).where(eq(chirps.userId, userId));
    return result.length;
  }
  const result = await db.select({ count: chirps.id }).from(chirps);
  return result.length;
}