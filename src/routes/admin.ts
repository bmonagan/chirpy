import { Router } from "express";
import { chirpyConfig } from "../config.js";
import { ForbiddenError } from "../error_classes.js";
import { resetUsers } from "../lib/db/queries/users.js";
import { db } from "../lib/db/index.js";
import { users } from "../schema.js";
import { eq } from "drizzle-orm";

const router = Router();

router.all("/api/healthz", async (req, res) => {
  const start = Date.now();
  let dbStatus = "ok";

  try {
    await db.select().from(users).limit(1);
  } catch {
    dbStatus = "error";
  }

  const response = {
    status: dbStatus === "ok" ? "healthy" : "unhealthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: dbStatus
    },
    responseTime: `${Date.now() - start}ms`,
    platform: chirpyConfig.apiConfig.platform
  };

  const statusCode = dbStatus === "ok" ? 200 : 503;
  res.setHeader('Content-Type', 'application/json');
  return res.status(statusCode).json(response);
});

router.all("/admin/metrics", (req, res) => {
  res.setHeader('Content-Type', "text/html; charset=utf-8");
  return res.send(`<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${chirpyConfig.apiConfig.fileServerHits} times!</p>
  </body>
</html>`);
});

router.post("/admin/reset", (req, res, next) => {
  Promise.resolve((async () => {
    chirpyConfig.apiConfig.fileServerHits = 0;
    if (chirpyConfig.apiConfig.platform !== "dev") {
      throw new ForbiddenError("Reset is only allowed in dev environment");
    }
    await resetUsers();
    return res.status(200).send('OK');
  })()).catch(next)
});

export default router;
