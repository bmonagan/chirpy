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

export async function getChirps(userId?: string, sort?: string = "asc") {
  if (sort !== "asc" && sort !== "desc") {
    throw new Error("Invalid sort order");
  }

  if (userId) {
    return await db.select().from(chirps).where(eq(chirps.userId, userId)).orderBy(sort === "asc" ? asc(chirps.createdAt) : desc(chirps.createdAt));
  }
  return await db.select().from(chirps).orderBy(sort === "asc" ? asc(chirps.createdAt) : desc(chirps.createdAt));
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