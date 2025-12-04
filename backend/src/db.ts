import dotenv from "dotenv";
import { Pool } from "pg";

// Load environment variables before using them
dotenv.config();

// Create a single shared connection pool for the whole app
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
