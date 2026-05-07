import {hash, verify} from "argon2";
export async function hashPassword(password: string): Promise<string> {
  return await hash(password);
}

export async function checkPasswordHash(password: string, hashed_password: string): Promise<boolean> {
  return await verify(hashed_password, password);
}
