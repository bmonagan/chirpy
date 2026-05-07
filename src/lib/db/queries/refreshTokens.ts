import { db } from "../../db/index.js";
import {eq} from "drizzle-orm";
import { refreshTokens } from "../../../schema.js";
import { NewRefreshToken } from "../../../schema.js";
import { makeRefreshToken } from "../../../auth.js";

export async function createRefreshToken(userId: string): Promise<NewRefreshToken> {
    const token = makeRefreshToken();
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    const newToken: NewRefreshToken = {
        token,
        userId,
        expiresAt
    }
    await db.insert(refreshTokens).values(newToken);
    return newToken;
}

export async function validateRefreshToken(token: string) {
    const tokenRecord = await db
  .select()
  .from(refreshTokens)
  .where(eq(refreshTokens.token, token))
  .limit(1)
  .then(res => res[0]);
    if (!tokenRecord) {
        throw new Error("Invalid refresh token");
    }
    if (tokenRecord.revokedAt) {
        throw new Error("Refresh token has been revoked");
    }
    if (tokenRecord.expiresAt < new Date()) {
        throw new Error("Refresh token has expired");
    }
    return tokenRecord;
}

export async function getUserIdFromRefreshToken(token: string): Promise<string> {
    const tokenRecord = await validateRefreshToken(token);
    return tokenRecord.userId;
}

export async function revokeRefreshToken(token: string): Promise<void> {
    await db.update(refreshTokens)
    .set({ revokedAt: new Date() })
    .where(eq(refreshTokens.token, token));
}