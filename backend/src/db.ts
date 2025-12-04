import pkg from "pg";
const { Pool } = pkg;

export const pool = new Pool({
  host: "localhost",  
  port: 1234,
  user: "kbo",
  password: "kbo",
  database: "kbo",
});