import express from "express";
import e, { Request, Response, NextFunction } from "express";
import { chirpyConfig } from './config.js'
import { filterProfanity, BodyClean } from "./profanity_filter.js";
import { BadRequestError, UnauthorizedError, ForbiddenError, NotFoundError, MethodNotAllowedError, ConflictError, UnprocessableEntityError, InternalServerError } from './error_classes.js';
import {middlewareLogResponses, middlewareMetricsInc, errorHandler, validateChirp
} from './middleware.js'

const app = express();
const PORT = 8080;

app.use("/app", middlewareMetricsInc,express.static("./src/app"));
app.use(express.json());
app.use(middlewareLogResponses);
app.post("/api/validate_chirp", (req, res, next) => {
  Promise.resolve(validateChirp(req, res,next)).catch(next);
});

app.all('/api/healthz', (req, res) => {
  console.log('Accessing the health check endpoint ...')
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('OK');
})

app.all("/admin/metrics", (req,res) => {
    res.setHeader('Content-Type', "text/html; charset=utf-8");
    return res.send(`<html>
  <body>
    <h1>Welcome, Chirpy Admin</h1>
    <p>Chirpy has been visited ${chirpyConfig.fileserverHits} times!</p>
  </body>
</html>`);
})
app.post("/admin/reset", (req,res) => { 
    chirpyConfig.fileserverHits = 0;
    return res.status(200).send('OK');
})

// Error handler should be the last thing before server running.
app.use(errorHandler);
// Final step for the server to be running.
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});


