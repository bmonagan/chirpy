import express from "express";
import e, { Request, Response, NextFunction } from "express";
import { chirpyConfig } from './config.js'
import { filterProfanity, BodyClean } from "./profanity_filter.js";

const app = express();
const PORT = 8080;

app.use("/app", middlewareMetricsInc,express.static("./src/app"));
app.use(express.json());
app.use(middlewareLogResponses);
app.post("/api/validate_chirp", validateChirp);

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

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});

function middlewareLogResponses(req: Request, res: Response, next: NextFunction) {
  res.on("finish", () => {
    const status = res.statusCode;
    if (status >= 400) {
        
        console.log(`[NON-OK] ${req.method} ${req.url} - Status: ${status}`);
    }
  })
  next();
}

function middlewareMetricsInc(req: Request, res: Response, next: NextFunction) {
    res.on("finish" , () => { 
        chirpyConfig.fileserverHits += 1;
    })
    next();
}

async function validateChirp(req: Request, res: Response) {
  req.on("end", () => {
    try {
      const parsedBody = req.body.body;
      if (parsedBody.length > 140) { 
        return res.status(400).send({"error": "Chirp is too long" });
      }
      const bodyClean: BodyClean = filterProfanity(parsedBody);
      const bodyMessage = bodyClean.wasCleaned ? "cleanedBody" : "body";
      return res.status(200).send({[bodyMessage]: bodyClean.body});
    } catch (error) {
      return res.status(400).send({"error": "Invalid JSON" });
    }
  });
}