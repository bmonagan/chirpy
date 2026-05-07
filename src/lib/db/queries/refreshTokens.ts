import { db } from "../../db/index.js";

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