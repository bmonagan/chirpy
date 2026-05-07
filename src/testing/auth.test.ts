import { describe, it, expect, beforeAll, test } from "vitest";
import { checkPasswordHash, hashPassword, makeJWT, validateJWT } from "../auth.js";

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
describe("JWT Operations", () => {
  const mockUser = { id: "1", email: "test@example.com" };
  let token: string;

  beforeAll(() => {
    // Generate a token to use in the following tests
    token = makeJWT(mockUser.id, 3600, "testSecret");
  });

  it("should successfully validate a correctly signed JWT and return the payload", () => {
    const decoded = validateJWT(token, "testSecret");
    
    // We use matchObject because JWTs often add 'iat' (issued at) timestamps
    expect(decoded).toMatchObject(mockUser);
  });

  it("should return null or throw when the token signature is tampered with", () => {
    const tamperedToken = token + "invalidSuffix";
    const result = validateJWT(tamperedToken, "testSecret");
    
    // Assuming your validateJWT returns null on failure
    expect(result).toBeNull();
  });

  it("should fail validation when provided with a completely malformed string", () => {
    const result = validateJWT("this.isnot.atoken", "testSecret");
    
    expect(result).toBeNull();
  });
});