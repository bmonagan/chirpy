import express from "express";
import { Request, Response, NextFunction } from "express";
import { chirpyConfig } from './config.js'

const app = express();
const PORT = 8080;

app.use("/app", middlewareMetricsInc,express.static("./src/app"));
app.use(middlewareLogResponses);

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
app.all("/api/reset", (req,res) => { 
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