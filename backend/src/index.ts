import express from "express";
import cors from "cors";
import { pool } from "./db";


const app = express();
const port = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Healthcheck route
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// GET /enterprises?take=50&skip=0
app.get("/enterprises", async (req, res) => {
  try {
    const take = Number(req.query.take) || 50;
    const skip = Number(req.query.skip) || 0;

    const result = await pool.query(
      `
      SELECT 
        e.enterprisenumber,
        e.status,
        e.juridicalsituation,
        e.typeofenterprise,
        e.juridicalform,
        e.juridicalformcac,
        e.startdate,
        d.denomination AS name
      FROM enterprise e
      LEFT JOIN denomination d
        ON d.entitynumber = e.enterprisenumber
       AND d.language = '2'              -- 2 = FR in your CSV
       AND d.typeofdenomination = '001'  -- main denomination
      ORDER BY e.enterprisenumber ASC
      LIMIT $1 OFFSET $2
      `,
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

    // Fetch enterprise + denomination + address
    const enterpriseResult = await pool.query(
      `
      SELECT 
        e.enterprisenumber,
        e.status,
        e.juridicalsituation,
        e.typeofenterprise,
        e.juridicalform,
        e.juridicalformcac,
        e.startdate,
        d.denomination AS name,
        a.streetfr,
        a.zipcode,
        a.municipalityfr
      FROM enterprise e
      LEFT JOIN denomination d
        ON d.entitynumber = e.enterprisenumber
       AND d.language = '2'              -- FR
       AND d.typeofdenomination = '001'  -- main denomination
      LEFT JOIN address a
        ON a.entitynumber = e.enterprisenumber
       AND a.typeofaddress = 'REGO'
      WHERE e.enterprisenumber = $1
      `,
      [id]
    );

    if (enterpriseResult.rowCount === 0) {
      return res.status(404).json({ message: "Enterprise not found" });
    }

    const enterprise = enterpriseResult.rows[0];

    // Fetch related establishments
    const establishmentsResult = await pool.query(
      `
      SELECT *
      FROM establishment
      WHERE enterprisenumber = $1
      ORDER BY establishmentnumber ASC
      `,
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

app.get("/tables", async (_req, res) => {
  try {
    const result = await pool.query<{
      table_name: string;
    }>(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);

    res.json({
      connected: true,
      tables: result.rows.map(r => r.table_name),
    });
  } catch (error: any) {
    console.error("Error testing DB connection:", error);
    res.status(500).json({
      connected: false,
      error: error.message,
    });
  }
});


// Start HTTP server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
