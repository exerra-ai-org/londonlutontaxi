import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { config } from "../config";

const client = postgres(config.database.url, {
  ssl: { rejectUnauthorized: false },
  max: config.database.pool.max,
  idle_timeout: config.database.pool.idleTimeoutSeconds,
  connect_timeout: config.database.pool.connectTimeoutSeconds,
});

export const db = drizzle(client, { schema });
