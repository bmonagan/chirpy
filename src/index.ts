import express from "express";
import { chirpyConfig } from './config.js'
import {middlewareLogResponses, middlewareMetricsInc, errorHandler, validateChirp } from './middleware.js'
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";
import { createUser, resetUsers } from "./lib/db/queries/users.js";
import { BadRequestError, ConflictError, ForbiddenError } from "./error_classes.js";
import { getChirpById, getChirps } from "./lib/db/queries/chirps.js";
import { hashPassword } from "./auth.js";
import { getUserByEmail } from "./lib/db/queries/users.js";

const migrationClient = postgres(chirpyConfig.dbConfig.url, { max: 1 });
await migrate(drizzle(migrationClient), chirpyConfig.dbConfig.migrationConfig);

const app = express();
const PORT = 8080;

app.use("/app", middlewareMetricsInc,express.static("./src/app"));
app.use(express.json());
app.use(middlewareLogResponses);
app.post("/api/chirps", (req, res, next) => {
  Promise.resolve(validateChirp(req, res,next)).catch(next);
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
    const newUser = await createUser({ email: email.trim(), hashed_password: hashedPassword });
    if (!newUser) {
      throw new ConflictError("User with this email already exists");
    }

    return res.status(201).json(newUser);
  })()).catch(next)
});
app.post("/api/login", (req,res,next) => {
  Promise.resolve((async () => {
    const email = req.body?.email;
    const password = req.body?.password; 
    if (typeof email !== "string" || email.trim().length === 0) {
      return res.status(400).json({ message: "Email is required" });
    }
    if (typeof password !== "string" || password.trim().length === 0) {
      return res.status(400).json({ message: "Password is required" });
    }
    const user = await getUserByEmail(email.trim());
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

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

// Error handler should be the last thing before server running.
app.use(errorHandler);
// Final step for the server to be running.
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});


