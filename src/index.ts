import express, { application } from "express";
import { chirpyConfig } from './config.js'
import {middlewareLogResponses, middlewareMetricsInc, errorHandler, validateChirp, asyncHandler } from './middleware.js'
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser, resetUsers } from "./lib/db/queries/users.js";
import { BadRequestError, ConflictError, ForbiddenError } from "./error_classes.js";
import { getChirpById, getChirps } from "./lib/db/queries/chirps.js";
import { hashPassword,checkPasswordHash, makeJWT, validateJWT, getBearerToken, makeRefreshToken } from "./auth.js";
import { getUserByEmail } from "./lib/db/queries/users.js";
import { createRefreshToken,getUserIdFromRefreshToken, revokeRefreshToken } from "./lib/db/queries/refreshTokens.js";
import { get } from "http";


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
    refreshToken: refreshToken.token
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
  const refreshToken = req.body?.refreshToken;
  if (typeof refreshToken !== "string" || refreshToken.trim().length === 0) {
    return res.status(401).json({ message: "Refresh token is required" });
  }
  await revokeRefreshToken(refreshToken);
  return res.status(204).json({ message: "Refresh token revoked successfully" });
}));
// Error handler should be the last thing before server running.
app.use(errorHandler);
// Final step for the server to be running.
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
