import express from "express";

const app = express();
const PORT = 8080;

app.use("/app", express.static("./src/app"));

app.all('/healthz', (req, res) => {
  console.log('Accessing the health check endpoint ...')
  res.setHeader('Content-Type', 'text/plain');
  return res.status(200).send('OK');
})

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});