import express from "express";
import cors from "cors";
import { pool } from "./db";
import { isAuthError } from "./db";


const app = express();
const port = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Quick DB connectivity check on startup
(async () => {
  try {
    const client = await pool.connect();
    await client.query("SELECT 1");
    client.release();
    console.log("Database connection OK");
  } catch (err) {
    console.error("Database connection FAILED:", err);
    if (isAuthError(err)) {
      console.error(
        "Hint: 28P01 indicates the Postgres data directory already has different credentials. Stop containers, delete ./postgres-data, then `docker compose up -d`."
      );
    }
  }
})();

// Healthcheck route
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// GET /enterprises?take=50&skip=0
app.get("/enterprises", async (req, res) => {
  try {
    const take = Number(req.query.take) || 50;
    const skip = Number(req.query.skip) || 0;

    // Simple SQL query with limit/offset
    const result = await pool.query(
      `SELECT *
       FROM enterprise
       ORDER BY enterprisenumber ASC
       LIMIT $1 OFFSET $2`,
      [take, skip]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching enterprises:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /enterprises/:id
app.get("/enterprises/:id", async (req, res) => {
  try {
    const id = req.params.id;

    // Fetch enterprise
    const enterpriseResult = await pool.query(
      `SELECT *
       FROM enterprise
       WHERE enterprisenumber = $1`,
      [id]
    );

    if (enterpriseResult.rowCount === 0) {
      return res.status(404).json({ message: "Enterprise not found" });
    }

    const enterprise = enterpriseResult.rows[0];

    // Fetch related establishments
    const establishmentsResult = await pool.query(
      `SELECT *
       FROM establishment
       WHERE enterprisenumber = $1
       ORDER BY establishmentnumber ASC`,
      [id]
    );

    // Attach establishments to enterprise object
    const response = {
      ...enterprise,
      establishments: establishmentsResult.rows,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching enterprise:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /enterprises/:id/establishments
app.get("/enterprises/:id/establishments", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await pool.query(
      `SELECT *
       FROM establishment
       WHERE enterprisenumber = $1
       ORDER BY establishmentnumber ASC`,
      [id]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching establishments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start HTTP server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
