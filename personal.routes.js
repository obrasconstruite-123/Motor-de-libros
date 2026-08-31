const router = require("express").Router();
const { requireAuth, requirePortal } = require("../../middleware/auth");
const { ROLES } = require("../../config/roles");
const ctrl = require("./personal.controller");

router.use(requireAuth, requirePortal("personal"));

router.use((req, res, next) => {
  if (!req.user.trabajadorId && ![ROLES.DUENO, ROLES.GERENTE].includes(req.user.rol)) {
    return res.status(403).json({ error: "Usuario sin ficha de trabajador asociada" });
  }
  next();
});

router.get("/mi-dia", ctrl.miDia);
router.post("/obras/:id/iniciar", ctrl.iniciarTrabajo);
router.post("/partes/:parteId/finalizar", ctrl.finalizarTrabajo);
router.patch("/partes/:parteId", ctrl.cargarParteDiario);
router.post("/obras/:id/fotos", ctrl.registrarFoto);

module.exports = router;
