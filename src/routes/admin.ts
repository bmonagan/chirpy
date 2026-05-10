import { Router } from "express";
import { chirpyConfig } from "../config.js";
import { ForbiddenError } from "../error_classes.js";
import { resetUsers } from "../lib/db/queries/users.js";

const router = Router();

router.all("/api/healthz", (req, res) => {
  console.log('Accessing the health check endpoint ...')
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('OK');
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
