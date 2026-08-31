const prisma = require("../../config/prisma");
const { ROLES } = require("../../config/roles");

// Calcula SOLO el total a cobrar. Nunca se calculan ni se devuelven
// margenPct, costos de materiales reales, ni costo de personal: el cliente
// jamas debe ver esos numeros, ni siquiera indirectamente.
function totalPresupuesto(obra) {
  const base =
    Number(obra.presupuestoMateriales) +
    Number(obra.presupuestoManoObra) +
    Number(obra.presupuestoSubcontratos);
  const subtotal = base + base * (Number(obra.margenPct) / 100);
  return subtotal + subtotal * (Number(obra.ivaPct) / 100);
}

// GET /api/cliente/consorcios
// Devuelve unicamente los edificios de la administracion del usuario logueado.
async function misConsorcios(req, res) {
  const consorcios = await prisma.consorcio.findMany({
    where: req.user.rol === ROLES.DUENO ? {} : { administracionId: req.user.administracionId },
    select: { id: true, nombre: true, direccion: true }, // nada de datos internos
  });
  res.json(consorcios);
}

// GET /api/cliente/obras
// Devuelve las obras de los edificios del cliente, con SOLO los campos
// que el documento autoriza a mostrar (nunca costos ni margen ni proveedores).
async function misObras(req, res) {
  const obras = await prisma.obra.findMany({
    where: req.user.rol === ROLES.DUENO ? {} : { consorcio: { administracionId: req.user.administracionId } },
    select: {
      id: true,
      numero: true,
      descripcion: true,
      estado: true,
      avancePct: true,
      fechaInicio: true,
      fechaFinEstimada: true,
      consorcio: { select: { nombre: true } },
      // presupuesto: seleccionamos los campos crudos SOLO para calcular el total
      // en el propio backend, y no los exponemos en la respuesta final (ver mapeo abajo)
      presupuestoMateriales: true,
      presupuestoManoObra: true,
      presupuestoSubcontratos: true,
      margenPct: true,
      ivaPct: true,
      pagos: { select: { monto: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  // Mapeamos a la forma final: total y saldo si, desglose interno no.
  const resultado = obras.map((o) => {
    const total = totalPresupuesto(o);
    const cobrado = o.pagos.reduce((s, p) => s + Number(p.monto), 0);
    return {
      id: o.id,
      numero: o.numero,
      descripcion: o.descripcion,
      estado: o.estado,
      avancePct: o.avancePct,
      fechaInicio: o.fechaInicio,
      fechaFinEstimada: o.fechaFinEstimada,
      edificio: o.consorcio.nombre,
      presupuestoTotal: total,
      cobrado,
      saldo: Math.max(0, total - cobrado),
    };
  });
  res.json(resultado);
}

// GET /api/cliente/obras/:id/fotos
async function fotosDeObra(req, res) {
  const { id } = req.params;
  // Verificamos que la obra pertenezca a este cliente ANTES de devolver nada.
  // Este chequeo es el que evita que un cliente cambiando el :id en la URL
  // pueda espiar fotos de la obra de otro cliente.
  const obra = await prisma.obra.findFirst({
    where: { id: Number(id), ...(req.user.rol === ROLES.DUENO ? {} : { consorcio: { administracionId: req.user.administracionId } }) },
    select: { id: true },
  });
  if (!obra) return res.status(404).json({ error: "Obra no encontrada" });

  const fotos = await prisma.fotoEvidencia.findMany({
    where: { obraId: obra.id },
    select: { etapa: true, url: true, createdAt: true },
  });
  res.json(fotos);
}

// POST /api/cliente/incidencias  { consorcioId, problema }
// El reclamo llega al sistema administrativo, nunca directo a un trabajador
// (tal como pide el documento: "la solicitud llega al admin, no al tecnico").
async function reportarIncidencia(req, res) {
  const { consorcioId, problema } = req.body;
  if (!consorcioId || !problema) return res.status(400).json({ error: "consorcioId y problema son requeridos" });

  const consorcio = await prisma.consorcio.findFirst({
    where: { id: Number(consorcioId), ...(req.user.rol === ROLES.DUENO ? {} : { administracionId: req.user.administracionId }) },
  });
  if (!consorcio) return res.status(404).json({ error: "Consorcio no encontrado" });

  const incidencia = await prisma.incidencia.create({
    data: { consorcioId: consorcio.id, problema, reportadoPorUsuarioId: req.user.id },
  });
  res.status(201).json(incidencia);
}

// POST /api/cliente/obras/:id/aceptar
async function aceptarPresupuesto(req, res) {
  const { id } = req.params;
  const obra = await prisma.obra.findFirst({
    where: { id: Number(id), ...(req.user.rol === ROLES.DUENO ? {} : { consorcio: { administracionId: req.user.administracionId } }), estado: "Presupuesto" },
  });
  if (!obra) return res.status(404).json({ error: "Presupuesto no encontrado o ya definido" });

  const actualizada = await prisma.obra.update({ where: { id: obra.id }, data: { estado: "Aprobada" } });
  res.json({ ok: true, obra: actualizada });
  // TODO produccion: disparar notificacion push/email al admin ("presupuesto aceptado")
}

module.exports = { misConsorcios, misObras, fotosDeObra, reportarIncidencia, aceptarPresupuesto };
