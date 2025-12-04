import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

// Prisma client uses DATABASE_URL from .env and schema.prisma
const prisma = new PrismaClient();

const app = express();
const port = process.env.PORT || 4000;

// Basic middlewares
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

    const enterprises = await prisma.enterprise.findMany({
      skip,
      take,
      orderBy: { enterpriseNumber: "asc" },
    });

    res.json(enterprises);
  } catch (error) {
    console.error("Error fetching enterprises:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /enterprises/:id
app.get("/enterprises/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const enterprise = await prisma.enterprise.findUnique({
      where: { enterpriseNumber: id },
      include: { establishments: true },
    });

    if (!enterprise) {
      return res.status(404).json({ message: "Enterprise not found" });
    }

    res.json(enterprise);
  } catch (error) {
    console.error("Error fetching enterprise:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// GET /enterprises/:id/establishments
app.get("/enterprises/:id/establishments", async (req, res) => {
  try {
    const id = req.params.id;

    const establishments = await prisma.establishment.findMany({
      where: { enterpriseNumber: id },
      orderBy: { establishmentNumber: "asc" },
    });

    res.json(establishments);
  } catch (error) {
    console.error("Error fetching establishments:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Start HTTP server
app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
