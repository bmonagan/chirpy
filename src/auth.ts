import {hash, verify} from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";
import { Request } from "express";
import crypto from "crypto";
import { UnauthorizedError } from "./error_classes.js";

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export async function hashPassword(password: string): Promise<string> {
  return await hash(password);
}

export async function checkPasswordHash(password: string, hashed_password: string): Promise<boolean> {
  return await verify(hashed_password, password);
}

export function makeJWT(userID: string, expiresIn: number, secret: string): string {
  const payload: payload = {
    sub: userID,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + expiresIn,
    iss: "chirpy"
   };
  return jwt.sign(payload, secret);
}

export function validateJWT(token: string, secret: string): payload {
  try {
    const decoded = jwt.verify(token, secret) as payload;
    return decoded;
  } catch (err) {
    throw new UnauthorizedError("Invalid token");
  }
}

export function getBearerToken(req: Request): string {
  const authorizationHeader = req.get("Authorization");
  if (!authorizationHeader) {
    throw new Error("Authorization header missing");
  }

  const spaceIndex = authorizationHeader.indexOf(" ");
  if (spaceIndex === -1) {
    throw new Error("Malformed authorization header");
  }

  const scheme = authorizationHeader.slice(0, spaceIndex);
  if (scheme.toLowerCase() !== "bearer") {
    throw new Error(`Invalid authorization scheme: ${scheme}`);
  }

  const token = authorizationHeader.slice(spaceIndex + 1).trim();
  if (!token) {
    throw new Error("Bearer token missing");
  }

  return token;
}

export function makeRefreshToken(): string {
  return crypto.randomBytes(64).toString("hex");
}