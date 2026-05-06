import express from "express";
import { chirpyConfig } from './config.js'
import {middlewareLogResponses, middlewareMetricsInc, errorHandler, validateChirp } from './middleware.js'
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";

const migrationClient = postgres(chirpyConfig.dbConfig.url, { max: 1 });
await migrate(drizzle(migrationClient), chirpyConfig.dbConfig.migrationConfig);

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
    <p>Chirpy has been visited ${chirpyConfig.apiConfig.fileServerHits} times!</p>
  </body>
</html>`);
})
app.post("/admin/reset", (req,res) => { 
    chirpyConfig.apiConfig.fileServerHits = 0;
    return res.status(200).send('OK');
})

// Error handler should be the last thing before server running.
app.use(errorHandler);
// Final step for the server to be running.
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});


