import express from "express";
import { chirpyConfig } from './config.js'
import { middlewareLogResponses, middlewareMetricsInc, errorHandler } from './middleware.js'
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { drizzle } from "drizzle-orm/postgres-js";

import chirpRoutes from "./routes/chirps.js";
import userRoutes from "./routes/users.js";
import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import webhookRoutes from "./routes/webhooks.js";
import likesRoutes from "./routes/likes.js";
import followsRoutes from "./routes/follows.js";
import commentsRoutes from "./routes/comments.js";

const migrationClient = postgres(chirpyConfig.dbConfig.url, { max: 1 });
await migrate(drizzle(migrationClient), chirpyConfig.dbConfig.migrationConfig);

const app = express();
const PORT = 8080;

app.use("/app", middlewareMetricsInc, express.static("./src/app"));
app.use(express.json());
app.use(middlewareLogResponses);

app.use("/api/chirps", chirpRoutes);
app.use("/api/chirps", likesRoutes);
app.use("/api/chirps", commentsRoutes);
app.use("/api/users", userRoutes);
app.use("/api/users", followsRoutes);
app.use("/api", authRoutes);
app.use("/", adminRoutes);
app.use("/api/polka/webhooks", webhookRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
