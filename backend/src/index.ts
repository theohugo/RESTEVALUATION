import express from "express";
import cors from "cors";
import {
  listEnterprises,
  getEnterpriseById,
  listEstablishmentsByEnterprise,
  listTables,
  updateEnterprise,
  createEnterprise,
  countEnterprises,
  createEstablishment,
  updateEstablishment,
  deleteEstablishment,
  deleteEnterprise,
  upsertEnterpriseAddress,
} from "./repositories/enterpriseRepository";

const app = express();
const port = process.env.PORT || 4000;

// Middlewares
app.use(cors());
app.use(express.json());

// Healthcheck route
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// GET /enterprises?take=50&skip=0&q=term
app.get("/enterprises", async (req, res) => {
  try {
    const take = Number(req.query.take) || 50;
    const skip = Number(req.query.skip) || 0;
    const q = typeof req.query.q === "string" ? req.query.q : undefined;

    const rows = await listEnterprises(take, skip, q);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching enterprises:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /enterprises/count?q=term
app.get("/enterprises/count", async (req, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : undefined;
    const total = await countEnterprises(q);
    res.json({ total });
  } catch (error) {
    console.error("Error counting enterprises:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /enterprises/:id
app.get("/enterprises/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const enterprise = await getEnterpriseById(id);
    if (!enterprise) {
      return res.status(404).json({ message: "Enterprise not found" });
    }

    res.json(enterprise);
  } catch (error) {
    console.error("Error fetching enterprise:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /enterprises/:id
app.put("/enterprises/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const updated = await updateEnterprise(id, req.body ?? {});
    if (!updated) {
      return res.status(404).json({ message: "Enterprise not found" });
    }
    res.json(updated);
  } catch (error) {
    console.error("Error updating enterprise:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /enterprises/:id
app.delete("/enterprises/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const ok = await deleteEnterprise(id);
    if (!ok) return res.status(404).json({ message: "Enterprise not found" });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting enterprise:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /enterprises
app.post("/enterprises", async (req, res) => {
  try {
    const body = req.body ?? {};
    const required = [
      "enterprisenumber",
      "name",
      "status",
      "juridicalsituation",
      "typeofenterprise",
      "juridicalform",
      "juridicalformcac",
      "startdate",
    ];
    const missing = required.filter((k) => {
      const v = body[k];
      return v === undefined || v === null || (typeof v === "string" && v.trim() === "");
    });
    if (missing.length > 0) {
      return res.status(400).json({
        message: "Missing required fields",
        missing,
      });
    }

    const created = await createEnterprise(body);
    if (!created) {
      // If insert did nothing due to conflict, return existing
      const existing = await getEnterpriseById(body.enterprisenumber);
      return res.status(200).json(existing);
    }
    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating enterprise:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /enterprises/:id/establishments
app.get("/enterprises/:id/establishments", async (req, res) => {
  try {
    const id = req.params.id;
    const rows = await listEstablishmentsByEnterprise(id);
    res.json(rows);
  } catch (error) {
    console.error("Error fetching establishments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// POST /enterprises/:id/establishments
app.post("/enterprises/:id/establishments", async (req, res) => {
  try {
    const enterpriseId = req.params.id;
    const body = req.body ?? {};
    if (!body.establishmentnumber) {
      return res.status(400).json({ message: "establishmentnumber is required" });
    }
    const created = await createEstablishment({
      establishmentnumber: String(body.establishmentnumber),
      enterprisenumber: enterpriseId,
      startdate: body.startdate ?? null,
    });
    res.status(201).json(created);
  } catch (error) {
    console.error("Error creating establishment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /establishments/:establishmentnumber
app.put("/establishments/:establishmentnumber", async (req, res) => {
  try {
    const estId = req.params.establishmentnumber;
    const updated = await updateEstablishment(estId, req.body ?? {});
    if (!updated) return res.status(404).json({ message: "Establishment not found" });
    res.json(updated);
  } catch (error) {
    console.error("Error updating establishment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// DELETE /establishments/:establishmentnumber
app.delete("/establishments/:establishmentnumber", async (req, res) => {
  try {
    const estId = req.params.establishmentnumber;
    const ok = await deleteEstablishment(estId);
    if (!ok) return res.status(404).json({ message: "Establishment not found" });
    res.status(204).send();
  } catch (error) {
    console.error("Error deleting establishment:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// PUT /enterprises/:id/address (create or update REGO address)
app.put("/enterprises/:id/address", async (req, res) => {
  try {
    const id = req.params.id;
    const exists = await getEnterpriseById(id);
    if (!exists) return res.status(404).json({ message: "Enterprise not found" });

    const updated = await upsertEnterpriseAddress(id, {
      streetfr: req.body?.streetfr ?? null,
      zipcode: req.body?.zipcode ?? null,
      municipalityfr: req.body?.municipalityfr ?? null,
    });
    res.json(updated);
  } catch (error) {
    console.error("Error upserting address:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

app.get("/tables", async (_req, res) => {
  try {
    const tables = await listTables();
    res.json({ connected: true, tables });
  } catch (error: any) {
    console.error("Error testing DB connection:", error);
    res.status(500).json({ connected: false, error: error.message });
  }
});

// Start HTTP server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
