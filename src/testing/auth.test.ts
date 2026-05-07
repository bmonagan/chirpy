import { describe, it, expect, beforeAll, test } from "vitest";
import { checkPasswordHash, hashPassword, makeJWT, validateJWT } from "../auth.js";
import { JwtPayload } from "jsonwebtoken";

type payload = Pick<JwtPayload, "iss" | "sub" | "iat" | "exp">;


describe("Password Hashing", () => {
  const password1 = "correctPassword123!";
  const password2 = "anotherPassword456!";
  let hash1: string;
  let hash2: string;

  beforeAll(async () => {
    hash1 = await hashPassword(password1);
    hash2 = await hashPassword(password2);
  });

  it("should return true for the correct password", async () => {
    const result = await checkPasswordHash(password1, hash1);
    expect(result).toBe(true);
  });
});


describe("JWT", () => {
  const userID = "user_123";
  const secret = "supersecretkey";
  const expiresIn = 3600;

  it("should return a string token", () => {
    const token = makeJWT(userID, expiresIn, secret);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
  });

  it("should produce a valid JWT with three dot-separated parts", () => {
    const token = makeJWT(userID, expiresIn, secret);
    const parts = token.split(".");
    expect(parts).toHaveLength(3);
  });

  it("should validate a freshly signed token and return the correct sub", () => {
    const token = makeJWT(userID, expiresIn, secret);
    const decoded: payload = validateJWT(token, secret);
    expect(decoded.sub).toBe(userID);
  });

  it("should include iat and exp claims in the decoded payload", () => {
    const before = Math.floor(Date.now() / 1000);
    const token = makeJWT(userID, expiresIn, secret);
    const decoded: payload = validateJWT(token, secret);
    const after = Math.floor(Date.now() / 1000);

    expect(decoded.iat).toBeGreaterThanOrEqual(before);
    expect(decoded.iat).toBeLessThanOrEqual(after);
    expect(decoded.exp).toBe((decoded.iat as number) + expiresIn);
  });

  it("should not include unexpected fields outside the payload type", () => {
    const token = makeJWT(userID, expiresIn, secret);
    const decoded: payload = validateJWT(token, secret);
    const allowedKeys: (keyof payload)[] = ["iss", "sub", "iat", "exp"];
    const decodedKeys = Object.keys(decoded);
    decodedKeys.forEach((key) => {
      expect(allowedKeys).toContain(key);
    });
  });

  it("should throw on a token signed with a different secret", () => {
    const token = makeJWT(userID, expiresIn, secret);
    expect(() => validateJWT(token, "wrongsecret")).toThrow("Invalid token");
  });

  it("should throw on a malformed / garbage token", () => {
    expect(() => validateJWT("not.a.token", secret)).toThrow("Invalid token");
  });

  it("should throw on an empty token string", () => {
    expect(() => validateJWT("", secret)).toThrow("Invalid token");
  });

  it("should throw on an expired token", async () => {
    const shortLivedToken = makeJWT(userID, 1, secret);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    expect(() => validateJWT(shortLivedToken, secret)).toThrow("Invalid token");
  });

  it("should produce different tokens for different userIDs", () => {
    const token1 = makeJWT("user_abc", expiresIn, secret);
    const token2 = makeJWT("user_xyz", expiresIn, secret);
    expect(token1).not.toBe(token2);
  });

  it("should produce different tokens on repeated calls for the same userID", () => {
    const token1 = makeJWT(userID, expiresIn, secret);
    const token2 = makeJWT(userID, expiresIn, secret);
    expect(token1).not.toBe(token2);
  });
});