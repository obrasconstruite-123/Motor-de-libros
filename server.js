require("dotenv").config();
require("express-async-errors"); // hace que los throw dentro de controllers async lleguen al errorHandler sin try/catch manual
const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");
const adminRoutes = require("./modules/admin/admin.routes");
const clienteRoutes = require("./modules/cliente/cliente.routes");
const personalRoutes = require("./modules/personal/personal.routes");
const errorHandler = require("./middleware/errorHandler");
const path = require("path");

const app = express();
app.set("trust proxy", 1);

const origenesPermitidos = (process.env.CORS_ORIGINS || "http://localhost:5173,http://localhost:3000,http://localhost:3001,http://localhost:3002")
  .split(",").map((s) => s.trim()).filter(Boolean);
app.use(cors({
  origin(origin, callback) {
    // Permite herramientas servidor-a-servidor (sin Origin) y solo frontends declarados.
    if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
    return callback(new Error("Origen no permitido por CORS"));
  },
  credentials: false,
}));
app.use(express.json({ limit: "2mb" }));

// Headers basicos de seguridad.
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  next();
});

app.get("/health", (req, res) => res.json({ ok: true, service: "construite-backend", version: "1.0.0" }));

// Un unico servidor, tres grupos de rutas completamente separados.
// Cada grupo tiene su propio middleware de portal (ver requirePortal en cada *.routes.js),
// asi que aunque compartan el mismo proceso, un usuario CLIENTE nunca puede
// llegar a codigo de /api/admin ni de /api/personal, y viceversa.
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/cliente", clienteRoutes);
app.use("/api/personal", personalRoutes);

// En produccion el backend sirve tambien el frontend: un solo dominio/link.
const publicDir = path.resolve(__dirname, "../public");
app.use(express.static(publicDir, { index: "index.html", maxAge: process.env.NODE_ENV === "production" ? "1h" : 0 }));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/") || req.path === "/health") return next();
  res.sendFile(path.join(publicDir, "index.html"), (err) => err && next(err));
});

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));
app.use(errorHandler);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`CONSTRUCTORA OS backend escuchando en puerto ${PORT}`);
  console.log(`  /api/auth      -> login compartido`);
  console.log(`  /api/admin     -> portal DUENO / GERENTE`);
  console.log(`  /api/cliente   -> portal ADMINISTRADOR_CONSORCIO`);
  console.log(`  /api/personal  -> portal ENCARGADO / TRABAJADOR`);
});
