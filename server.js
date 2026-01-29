import express from "express";
import cookieParser from "cookie-parser";
import "dotenv/config";
import path from "path";
import { fileURLToPath } from "url";

import authRoutes from "./server/routes/auth.routes.js";
import usersRoutes from "./server/routes/users.routes.js";

const app = express();
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

// API
app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);

// Serve Vite build (dist folder)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const clientDist = path.join(__dirname, "dist");
app.use(express.static(clientDist));

// SPA fallback (all other routes return index.html)
app.get("*", (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`✅ Server running on port ${port}`));
