import { db } from "../index.js";
import { NewUser, users } from "../../../schema.js";
import { eq } from "drizzle-orm";

export async function createUser(user: NewUser) {
  const [result] = await db
    .insert(users)
    .values(user)
    .onConflictDoNothing()
    .returning();
  return result;
}

export async function resetUsers() {
  await db.delete(users);
}

export async function getUserByEmail(email: string) {
  const [result] = await db.select().from(users).where(eq(users.email, email));
  return result ?? null;
}

export async function updateUser(user: { id: string; email: string; hashedPassword: string }) {
  const [result] = await db.update(users).set({ email: user.email, hashedPassword: user.hashedPassword }).where(eq(users.id, user.id)).returning();
  return result;
}

export async function updateUserChirpyRedStatus(userId: string, isChirpyRed: boolean) {
  const [result] = await db.update(users).set({ isChirpyRed }).where(eq(users.id, userId)).returning();
  return result;
}

export async function getUserById(id: string) {
  const [result] = await db.select().from(users).where(eq(users.id, id));
  return result ?? null;
}

export async function updateUserProfile(userId: string, bio?: string, avatarUrl?: string) {
  const updateData: { bio?: string; avatarUrl?: string } = {};
  if (bio !== undefined) updateData.bio = bio;
  if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

  const [result] = await db.update(users).set(updateData).where(eq(users.id, userId)).returning();
  return result;
}