import express, { application } from "express";
import { chirpyConfig } from './config.js'
import {middlewareLogResponses, middlewareMetricsInc, errorHandler, validateChirp, asyncHandler } from './middleware.js'
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser, resetUsers, updateUserChirpyRedStatus } from "./lib/db/queries/users.js";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from "./error_classes.js";
import { deleteChirpById, getChirpById, getChirps } from "./lib/db/queries/chirps.js";
import { hashPassword,checkPasswordHash, makeJWT, validateJWT, getBearerToken, makeRefreshToken, Payload } from "./auth.js";
import { getUserByEmail, updateUser } from "./lib/db/queries/users.js";
import { createRefreshToken,getUserIdFromRefreshToken, revokeRefreshToken } from "./lib/db/queries/refreshTokens.js";


const migrationClient = postgres(chirpyConfig.dbConfig.url, { max: 1 });
await migrate(drizzle(migrationClient), chirpyConfig.dbConfig.migrationConfig);

const app = express();
const PORT = 8080;

app.use("/app", middlewareMetricsInc,express.static("./src/app"));
app.use(express.json());
app.use(middlewareLogResponses);
app.post("/api/chirps", async (req, res, next) => {
  try {
    const token = getBearerToken(req);
    const payload = validateJWT(token, chirpyConfig.JWTSecret);
    const userID = payload.sub;
    if (!userID) {
      throw new ForbiddenError("Invalid token: missing user ID");
    }
    await validateChirp(req, res, next, userID);
  } catch (err) {
    next(err);
  }
});

app.get("/api/chirps", (req,res,next) => {
  Promise.resolve((async () => {
    const chirps = await getChirps();
    return res.status(200).json(chirps);
  })()).catch(next)
});
app.post("/api/users" ,(req,res,next) => {
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
app.put("/api/users", asyncHandler(async (req, res) => {
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
app.post("/api/login", asyncHandler(async (req, res) => {
  const email = req.body?.email?.trim();
  const password = req.body?.password;
  const expiresInSeconds = 3600; // Default to 1 hour

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

app.get("/api/chirps/:chirpId", (req,res,next) => {
  Promise.resolve((async () => {
  const chirpId = req.params.chirpId;
  if (!chirpId) {
    throw new BadRequestError("Invalid chirp ID");
  }
  const chirp = await getChirpById(chirpId);
  if (!chirp) {
    return res.status(404).json({ message: "Chirp not found" });
  }
  return res.status(200).json(chirp);
  })()).catch(next)
  });
app.all('/api/healthz', (req, res) => {
  console.log('Accessing the health check endpoint ...')
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('OK');
});

app.all("/admin/metrics", (req,res) => {
    res.setHeader('Content-Type', "text/html; charset=utf-8");
    return res.send(`<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${chirpyConfig.apiConfig.fileServerHits} times!</p>
  </body>
</html>`);
})
app.post("/admin/reset", (req,res,next) => {
  Promise.resolve((async () => {
    chirpyConfig.apiConfig.fileServerHits = 0;
    if (chirpyConfig.apiConfig.platform !== "dev") {
      throw new ForbiddenError("Reset is only allowed in dev environment");
    }
    await resetUsers();
    return res.status(200).send('OK');
  })()).catch(next)
})
app.post("/api/refresh", asyncHandler(async (req,res) => {
  const refreshToken = getBearerToken(req);
  const userId = await getUserIdFromRefreshToken(refreshToken);
  return res.status(200).json({
    token: makeJWT(userId, 3600, chirpyConfig.JWTSecret)
  });
}))
app.post("/api/revoke", asyncHandler(async (req,res) => {
  const refreshToken = getBearerToken(req);
  if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
    return res.status(401).json({ message: "Refresh token is required" });
  }
  await revokeRefreshToken(refreshToken);
  return res.status(204).json({ message: "Refresh token revoked successfully" });
}));
app.delete("/api/chirps/:chirpId", asyncHandler(async (req,res) => {
  const { chirpId } = req.params;
  if (typeof chirpId !== "string") {
    throw new BadRequestError("Invalid chirp ID");
  }
  let token: string;
  let payload: Payload;
  try {
    token = getBearerToken(req);
    payload = validateJWT(token, chirpyConfig.JWTSecret);
  } catch {
    throw new UnauthorizedError("Must be authorized to delete chirp");
  }
  const userID = payload.sub;
  if (!userID) {
    throw new ForbiddenError("Invalid token: missing user ID");
  }
  const chirp = await getChirpById(chirpId);
  if (!chirp) {
    throw new NotFoundError("Chirp not found");
  }
  if (chirp.userId !== userID) {
    throw new ForbiddenError("Users can only delete their own chirps");
  }
  await deleteChirpById(chirpId);
  return res.status(204).send();
}))
app.post("/api/polka/webhooks", (req,res) => {
  if (!req.body.event) {
    return res.status(400).json({ message: "Invalid event" });
  }
  if (req.body.event != "user.upgraded") {
    return res.status(204).json({ message: "Event ignored" });
  }
  const userId = req.body.data?.userId;
  if (!userId) {
    return res.status(404).json({ message: "Invalid event data: missing userId" });
  }
  updateUserChirpyRedStatus(userId, true).catch(err => {
    return res.status(404).json({ message: "Failed to update user chirpy red statusnp" });
  });
  return res.status(204).json({ message: "Chirpy red status updated" });
});
// Error handler should be the last thing before server running.
app.use(errorHandler);
// Final step for the server to be running.
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
