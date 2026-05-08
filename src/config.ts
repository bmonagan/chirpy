import { MigrationConfig } from "drizzle-orm/migrator";
import { migrationConfig } from "./lib/db/migrations/migrationConfig.js";

process.loadEnvFile()

type DBConfig  = {
  url: string;
  migrationConfig: MigrationConfig;
}
type APIConfig = {
  fileServerHits: number;
  platform: string;
  polkaKey: string;
};
type Config = {
  apiConfig: APIConfig;
  dbConfig: DBConfig;
  JWTSecret: string;
}

// Load configuration from environment variables and export as chirpyConfig
let dbConfig:DBConfig = {
  url: envOrThrow("DB_URL"),
  migrationConfig: migrationConfig
} 
let apiConfig: APIConfig = {
  fileServerHits: 0,
  platform: envOrThrow("PLATFORM"),
  polkaKey: envOrThrow("POLKA_KEY")
}
let JWTSecret: string = envOrThrow("SERVER_SECRET");
export let chirpyConfig: Config = {
  dbConfig: dbConfig,
  apiConfig: apiConfig,
  JWTSecret: JWTSecret
};

function envOrThrow(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Environment variable ${key} is not set`);
  }
  return value;
}