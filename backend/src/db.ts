import dotenv from "dotenv";
import { Pool } from "pg";

// Load environment variables before using them
dotenv.config();

// Create a single shared connection pool for the whole app
export const pool = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: Number(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || "kbo",
  password: process.env.DB_PASSWORD || "kbo",
  database: process.env.DB_NAME || "kbo",
  // optional: disable SSL for local dev
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

// Diagnostics: show current connection parameters (without password)
(() => {
  const { DB_HOST, DB_PORT, DB_USER, DB_NAME, DB_SSL } = process.env;
  console.log(
    `DB config -> host=${DB_HOST || "localhost"} port=${DB_PORT || "5432"} user=${DB_USER || "kbo"} db=${DB_NAME || "kbo"} ssl=${DB_SSL || "false"}`
  );
})();

// Helper to identify auth errors for targeted hints
export function isAuthError(err: unknown): boolean {
  return !!(err && typeof err === "object" && (err as any).code === "28P01");
}
