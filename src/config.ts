import { MigrationConfig } from "drizzle-orm/migrator";
import { migrationConfig } from "./lib/db/migrations/migrationConfig.js";

process.loadEnvFile()

type DBConfig  = {
  url: string;
  migrationConfig: MigrationConfig;
}
type APIConfig = {
  fileServerHits: number;
};
type Config = {
  apiConfig: APIConfig;
  dbConfig: DBConfig;
}

let dbConfig:DBConfig = {
  url: envOrThrow("DB_URL"),
  migrationConfig: migrationConfig
}
let apiConfig: APIConfig = {
  fileServerHits: 0
}
export let chirpyConfig: Config = {
  dbConfig: dbConfig,
  apiConfig: apiConfig
};

function envOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}