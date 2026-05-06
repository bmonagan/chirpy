process.loadEnvFile()
type APIConfig = {
  fileserverHits: number;
  dbURL: string;
};

export let chirpyConfig: APIConfig = {fileserverHits:0,dbURL:process.env.DB_URL || ""};