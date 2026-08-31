const prisma = require("../../config/prisma");
const { ROLES } = require("../../config/roles");

// GET /api/personal/mi-dia
// Tareas asignadas HOY al trabajador logueado. Nada de CRM, nada de plata,
// nada de otros edificios: solo direccion + tarea + horario, como pide el documento.
async function miDia(req, res) {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const manana = new Date(hoy);
  manana.setDate(manana.getDate() + 1);

  const asignaciones = await prisma.asignacionObra.findMany({
    where: { ...(req.user.trabajadorId ? { trabajadorId: req.user.trabajadorId } : {}), fecha: { gte: hoy, lt: manana } },
    select: {
      id: true,
      horaInicioPrevista: true,
      horaFinPrevista: true,
      tarea: true,
      obra: {
        select: {
          id: true,
          numero: true,
          descripcion: true,
          consorcio: { select: { nombre: true, direccion: true } },
          // notese lo que NO se selecciona: presupuesto*, margenPct, ivaPct,
          // consorcio.administracion (nombre/telefono del cliente)
        },
      },
    },
  });
  res.json(asignaciones);
}

// POST /api/personal/obras/:id/iniciar   { lat, lng }
async function iniciarTrabajo(req, res) {
  const { id } = req.params;
  const { lat, lng } = req.body;

  // Aislamiento a nivel de consulta: solo puede iniciar una obra si tiene
  // una asignacion vigente ahi. Si cambia el :id de la URL a otra obra, esto da 404.
  const asignacion = await prisma.asignacionObra.findFirst({
    where: { obraId: Number(id), ...(req.user.trabajadorId ? { trabajadorId: req.user.trabajadorId } : {}) },
  });
  if (!asignacion) return res.status(404).json({ error: "No tenes esta obra asignada" });

  const parte = await prisma.parteDiario.create({
    data: {
      obraId: Number(id),
      trabajadorId: req.user.trabajadorId || (await prisma.asignacionObra.findFirst({ where: { obraId: Number(id) }, select: { trabajadorId: true } })).trabajadorId,
      horaInicio: new Date(),
      ubicacionInicioLat: lat,
      ubicacionInicioLng: lng,
    },
  });
  res.status(201).json(parte);
}

// POST /api/personal/partes/:parteId/finalizar   { lat, lng }
async function finalizarTrabajo(req, res) {
  const { parteId } = req.params;
  const { lat, lng } = req.body;

  const parte = await prisma.parteDiario.findFirst({
    where: { id: Number(parteId), ...(req.user.trabajadorId ? { trabajadorId: req.user.trabajadorId } : {}) },
  });
  if (!parte) return res.status(404).json({ error: "Parte diario no encontrado" });

  const actualizado = await prisma.parteDiario.update({
    where: { id: parte.id },
    data: { horaFin: new Date(), ubicacionFinLat: lat, ubicacionFinLng: lng },
  });
  res.json(actualizado);
}

// PATCH /api/personal/partes/:parteId
// { tareasRealizadas: string[], materialUtilizado: [{material,cantidad}], observaciones, estadoTrabajo }
async function cargarParteDiario(req, res) {
  const { parteId } = req.params;
  const { tareasRealizadas, materialUtilizado, observaciones, estadoTrabajo } = req.body;

  const parte = await prisma.parteDiario.findFirst({
    where: { id: Number(parteId), ...(req.user.trabajadorId ? { trabajadorId: req.user.trabajadorId } : {}) },
  });
  if (!parte) return res.status(404).json({ error: "Parte diario no encontrado" });

  const actualizado = await prisma.parteDiario.update({
    where: { id: parte.id },
    data: {
      tareasRealizadas: tareasRealizadas ? JSON.stringify(tareasRealizadas) : undefined,
      materialUtilizado: materialUtilizado ? JSON.stringify(materialUtilizado) : undefined,
      observaciones,
      estadoTrabajo,
    },
  });
  res.json(actualizado);
}

// POST /api/personal/obras/:id/fotos   { etapa, url }
// El "url" ya viene subido a un storage (S3/Cloudinary) desde el celular con
// una signed URL - ver nota en el README, este endpoint solo registra la referencia.
async function registrarFoto(req, res) {
  const { id } = req.params;
  const { etapa, url } = req.body;
  if (!etapa || !url) return res.status(400).json({ error: "etapa y url son requeridos" });

  const asignacion = await prisma.asignacionObra.findFirst({
    where: { obraId: Number(id), ...(req.user.trabajadorId ? { trabajadorId: req.user.trabajadorId } : {}) },
  });
  if (!asignacion) return res.status(404).json({ error: "No tenes esta obra asignada" });

  const foto = await prisma.fotoEvidencia.create({
    data: { obraId: Number(id), etapa, url, subidoPorUsuarioId: req.user.id },
  });
  res.status(201).json(foto);
}

module.exports = { miDia, iniciarTrabajo, finalizarTrabajo, cargarParteDiario, registrarFoto };
