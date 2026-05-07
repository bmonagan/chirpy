import {hash, verify} from "argon2";
import jwt from "jsonwebtoken";
export async function hashPassword(password: string): Promise<string> {
  return await hash(password);
}

export async function checkPasswordHash(password: string, hashed_password: string): Promise<boolean> {
  return await verify(hashed_password, password);
}

function makeJWT(userID: string, expiresIn: number, secret: string): string {
  return jwt.sign({ userID }, secret, { expiresIn });
}