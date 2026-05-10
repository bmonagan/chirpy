import { Router } from "express";
import { asyncHandler } from "../middleware.js";
import { requireAuth, Payload, hashPassword, validateJWT, getBearerToken } from "../auth.js";
import { chirpyConfig } from "../config.js";
import { BadRequestError, ConflictError, UnauthorizedError } from "../error_classes.js";
import { createUser, updateUser } from "../lib/db/queries/users.js";

const router = Router();

router.post("/", (req, res, next) => {
  Promise.resolve((async () => {
    const email = req.body?.email;
    const password = req.body?.password;
    if (typeof email !== "string" || email.trim().length === 0) {
      throw new BadRequestError("Email is required");
    }
    if (typeof password !== "string" || password.trim().length === 0) {
      throw new BadRequestError("Password is required");
    }

    const hashedPassword = await hashPassword(password);
    const newUser = await createUser({ email: email.trim(), hashedPassword: hashedPassword });
    if (!newUser) {
      throw new ConflictError("User with this email already exists");
    }

    return res.status(201).json(newUser);
  })()).catch(next)
});

router.put("/", asyncHandler(async (req, res) => {
  const new_email = req.body?.email;
  const new_password = req.body?.password;

  if (typeof new_email !== "string" || new_email.trim().length === 0) {
    throw new BadRequestError("Email is required");
  }
  if (typeof new_password !== "string" || new_password.trim().length === 0) {
    throw new BadRequestError("Password is required");
  }

  let token: string;
  let payload: Payload;
  try {
    token = getBearerToken(req);
    payload = validateJWT(token, chirpyConfig.JWTSecret);
  } catch {
    throw new UnauthorizedError("Invalid token");
  }

  const userID = payload.sub;
  if (!userID) {
    throw new UnauthorizedError("Invalid token: missing user ID");
  }

  const hashedPassword = await hashPassword(new_password);
  const updatedUser = await updateUser({ id: userID, email: new_email.trim(), hashedPassword });

  return res.status(200).json(updatedUser);
}));

export default router;
