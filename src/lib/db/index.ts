import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "../../schema.js";
import { chirpyConfig } from "../../config.js";

const conn = postgres(chirpyConfig.dbURL);
export const db = drizzle(conn, { schema });