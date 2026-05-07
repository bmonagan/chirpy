import {hash, verify} from "argon2";
import jwt from "jsonwebtoken";
import type { JwtPayload } from "jsonwebtoken";

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;

export async function hashPassword(password: string): Promise<string> {
  return await hash(password);
}

export async function checkPasswordHash(password: string, hashed_password: string): Promise<boolean> {
  return await verify(hashed_password, password);
}

export function makeJWT(userID: string, expiresIn: number, secret: string): string {
  return jwt.sign({ userID }, secret, { expiresIn });
}

export function validateJWT(token: string, secret: string): payload {
  try {
    const decoded = jwt.verify(token, secret) as payload;
    return decoded;
  } catch (err) {
    throw new Error("Invalid token");
  }
}

export function getBearerToken(req: Request): string {
  const authorizationHeader = req.headers.get("Authorization");
  if (!authorizationHeader) {
    throw new Error("Authorization header missing");
  }
  const [scheme, token] = authorizationHeader.split(" ");
  if (scheme !== "Bearer") {
    throw new Error("Invalid authorization scheme");
  }
  return token;
}