const router = require("express").Router();
const { requireAuth, requirePortal } = require("../../middleware/auth");
const { ROLES } = require("../../config/roles");
const ctrl = require("./cliente.controller");

router.use(requireAuth, requirePortal("cliente"));

// Segunda barrera de seguridad, ademas del portal: un usuario de tipo cliente
// SIEMPRE tiene que tener administracionId. Si por algun bug no lo tiene,
// cortamos aca en vez de dejar pasar una consulta que devolveria "todo".
router.use((req, res, next) => {
  if (!req.user.administracionId && ![ROLES.DUENO].includes(req.user.rol)) {
    return res.status(403).json({ error: "Usuario cliente sin administracion asociada" });
  }
  next();
});

router.get("/consorcios", ctrl.misConsorcios);
router.get("/obras", ctrl.misObras);
router.get("/obras/:id/fotos", ctrl.fotosDeObra);
router.post("/incidencias", ctrl.reportarIncidencia);
router.post("/obras/:id/aceptar", ctrl.aceptarPresupuesto);

module.exports = router;
