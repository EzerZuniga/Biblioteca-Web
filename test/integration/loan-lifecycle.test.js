// Simula un servidor en UTC, como Railway, para comprobar las fechas de Lima.
process.env.TZ = "UTC";
delete process.env.ZONA_HORARIA;
delete process.env.DIAS_PRESTAMO;
delete process.env.MAX_PRESTAMOS_ACTIVOS;

const bd = require("../helpers/db");
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const api = require("../helpers/api");
const { crearLector, crearAdmin, crearLibro } = require("../helpers/fixtures");
const { sumarDias } = require("../../utils/dates");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());
beforeEach(() => bd.vaciarTablas());

// Perú no tiene horario de verano: siempre UTC-5.
const hoyEnLima = () =>
  new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().slice(0, 10);

const solicitar = (lector, libroId) =>
  api.post("/api/v1/prestamos", {
    token: lector.token,
    cuerpo: { libro_id: libroId },
  });

const accion = (admin, id, nombre, cuerpo) =>
  api.put(`/api/v1/prestamos/${id}/${nombre}`, { token: admin.token, cuerpo });

const prestar = async (admin, lector, libro) => {
  const { body } = await solicitar(lector, libro.id);
  await accion(admin, body.prestamo.id, "aprobar").expect(200);
  return body.prestamo.id;
};

// Lleva la fecha límite al pasado, como si hubieran pasado los días.
const vencer = (id, diasDeRetraso) =>
  bd.consultar("UPDATE prestamos SET fecha_limite = ? WHERE id = ?", [
    sumarDias(hoyEnLima(), -diasDeRetraso),
    id,
  ]);

describe("fecha límite y vencimientos", () => {
  it("aprobar fija la devolución a 14 días, en fecha de Lima", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const { body } = await solicitar(lector, (await crearLibro()).id);

    const res = await accion(admin, body.prestamo.id, "aprobar");
    assert.equal(res.body.prestamo.fecha_limite, sumarDias(hoyEnLima(), 14));
    assert.equal(res.body.prestamo.vencido, false);
  });

  it("un préstamo pasado su fecha límite figura vencido con sus días de retraso", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const id = await prestar(admin, lector, await crearLibro());
    await vencer(id, 3);

    const res = await api.get("/api/v1/prestamos", { token: lector.token });
    assert.equal(res.body.datos[0].vencido, true);
    assert.equal(res.body.datos[0].diasDeRetraso, 3);
  });

  it("el admin filtra los vencidos y ve el resumen", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro({ cantidad: 5 });
    const vencido = await prestar(admin, await crearLector(), libro);
    await prestar(admin, await crearLector(), libro);
    await solicitar(await crearLector(), libro.id);
    await vencer(vencido, 1);

    const filtrados = await api.get("/api/v1/prestamos?estado=vencido", {
      token: admin.token,
    });
    assert.deepEqual(
      filtrados.body.datos.map((p) => p.id),
      [vencido],
    );

    const resumen = await api.get("/api/v1/prestamos/resumen", {
      token: admin.token,
    });
    assert.deepEqual(resumen.body, {
      pendientes: 1,
      prestados: 2,
      vencidos: 1,
    });
  });

  it("el resumen es solo para administradores", async () => {
    const lector = await crearLector();
    const res = await api.get("/api/v1/prestamos/resumen", {
      token: lector.token,
    });
    assert.equal(res.status, 403);
  });
});

describe("reglas para pedir libros", () => {
  it("con un préstamo vencido no se puede pedir otro hasta devolverlo", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const id = await prestar(admin, lector, await crearLibro());
    await vencer(id, 2);
    const otro = await crearLibro();

    const bloqueado = await solicitar(lector, otro.id);
    assert.equal(bloqueado.status, 409);
    assert.match(bloqueado.body.mensaje, /vencidos/);

    await accion(admin, id, "devolver").expect(200);
    assert.equal((await solicitar(lector, otro.id)).status, 201);
  });

  it("un lector tiene como máximo 3 préstamos o solicitudes activas", async () => {
    const lector = await crearLector();
    for (let i = 0; i < 3; i++) {
      assert.equal(
        (await solicitar(lector, (await crearLibro()).id)).status,
        201,
      );
    }
    const cuarto = await solicitar(lector, (await crearLibro()).id);
    assert.equal(cuarto.status, 409);
    assert.match(cuarto.body.mensaje, /como máximo 3/);
  });
});

describe("rechazar solicitudes", () => {
  it("el admin rechaza una pendiente con un motivo", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const { body } = await solicitar(lector, (await crearLibro()).id);

    const res = await accion(admin, body.prestamo.id, "rechazar", {
      motivo: "  Ejemplar en reparación ",
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.prestamo.estado, "rechazado");
    assert.equal(res.body.prestamo.motivo_rechazo, "Ejemplar en reparación");
  });

  it("una solicitud rechazada deja pedir el libro de nuevo", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const libro = await crearLibro();
    const { body } = await solicitar(lector, libro.id);
    await accion(admin, body.prestamo.id, "rechazar").expect(200);

    assert.equal((await solicitar(lector, libro.id)).status, 201);
  });

  it("solo se rechazan pendientes, solo lo hace un admin y el motivo tiene límite", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const prestado = await prestar(admin, lector, await crearLibro());
    const { body } = await solicitar(lector, (await crearLibro()).id);

    assert.equal((await accion(admin, prestado, "rechazar")).status, 400);
    assert.equal(
      (await accion(lector, body.prestamo.id, "rechazar")).status,
      403,
    );
    const largo = await accion(admin, body.prestamo.id, "rechazar", {
      motivo: "x".repeat(256),
    });
    assert.equal(largo.status, 400);
  });
});

describe("cancelar solicitudes", () => {
  it("el lector cancela su propia solicitud pendiente", async () => {
    const lector = await crearLector();
    const { body } = await solicitar(lector, (await crearLibro()).id);

    const res = await accion(lector, body.prestamo.id, "cancelar");
    assert.equal(res.status, 200);
    assert.equal(res.body.prestamo.estado, "cancelado");
  });

  it("no puede cancelar la de otro: responde como si no existiera", async () => {
    const duena = await crearLector();
    const otro = await crearLector();
    const { body } = await solicitar(duena, (await crearLibro()).id);

    const res = await accion(otro, body.prestamo.id, "cancelar");
    assert.equal(res.status, 404);
  });

  it("no se cancela un préstamo ya aprobado, y el admin no cancela", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const prestado = await prestar(admin, lector, await crearLibro());

    assert.equal((await accion(lector, prestado, "cancelar")).status, 400);
    assert.equal((await accion(admin, prestado, "cancelar")).status, 403);
  });
});
