import { Router } from "express";
import { asyncHandler } from "../middleware.js";
import { hashPassword, checkPasswordHash, makeJWT, validateJWT, getBearerToken, makeRefreshToken } from "../auth.js";
import { chirpyConfig } from "../config.js";
import { getUserByEmail } from "../lib/db/queries/users.js";
import { createRefreshToken, getUserIdFromRefreshToken, revokeRefreshToken } from "../lib/db/queries/refreshTokens.js";

const router = Router();

router.post("/login", asyncHandler(async (req, res) => {
  const email = req.body?.email?.trim();
  const password = req.body?.password;
  const expiresInSeconds = 3600;

  if (typeof email !== "string" || email.length === 0) {
    return res.status(400).json({ message: "Email is required" });
  }
  if (typeof password !== "string" || password.trim().length === 0) {
    return res.status(400).json({ message: "Password is required" });
  }

  const user = await getUserByEmail(email);
  if (!user) {
    return res.status(401).json({ message: "Invalid email or password" });
  }

  const isPasswordValid = await checkPasswordHash(password, user.hashedPassword);
  if (!isPasswordValid) {
    return res.status(401).json({ message: "Invalid email or password" });
  }
  const refreshToken = await createRefreshToken(user.id);
  return res.status(200).json({
    id: user.id,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    email: user.email,
    token: makeJWT(user.id, expiresInSeconds, chirpyConfig.JWTSecret),
    refreshToken: refreshToken.token,
    isChirpyRed: user.isChirpyRed
  });
}));

router.post("/refresh", asyncHandler(async (req, res) => {
  const refreshToken = getBearerToken(req);
  const userId = await getUserIdFromRefreshToken(refreshToken);
  return res.status(200).json({
    token: makeJWT(userId, 3600, chirpyConfig.JWTSecret)
  });
}));

router.post("/revoke", asyncHandler(async (req, res) => {
  const refreshToken = getBearerToken(req);
  if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
    return res.status(401).json({ message: "Refresh token is required" });
  }
  await revokeRefreshToken(refreshToken);
  return res.status(204).json({ message: "Refresh token revoked successfully" });
}));

export default router;
