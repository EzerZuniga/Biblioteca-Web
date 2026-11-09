// Simula un servidor en UTC, como Railway, para comprobar las fechas de Lima.
process.env.TZ = "UTC";
delete process.env.ZONA_HORARIA;

const bd = require("../helpers/db");
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const api = require("../helpers/api");
const { crearLector, crearAdmin, crearLibro } = require("../helpers/fixtures");

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

const disponibles = async (token, libroId) => {
  const res = await api.get("/api/v1/libros", { token });
  return res.body.datos.find((l) => l.id === libroId).disponibles;
};

describe("flujo de un préstamo", () => {
  it("solicitar, aprobar y devolver con fechas de Lima", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const libro = await crearLibro({ cantidad: 1 });

    const solicitud = await solicitar(lector, libro.id);
    assert.equal(solicitud.status, 201);
    assert.equal(solicitud.body.prestamo.estado, "pendiente");
    assert.match(solicitud.body.prestamo.codigo, /^[0-9A-F]{8}$/);
    const id = solicitud.body.prestamo.id;

    const aprobado = await api.put(`/api/v1/prestamos/${id}/aprobar`, {
      token: admin.token,
    });
    assert.equal(aprobado.status, 200);
    assert.equal(aprobado.body.prestamo.fecha_prestamo, hoyEnLima());
    assert.equal(await disponibles(lector.token, libro.id), 0);

    const devuelto = await api.put(`/api/v1/prestamos/${id}/devolver`, {
      token: admin.token,
    });
    assert.equal(devuelto.status, 200);
    assert.equal(devuelto.body.prestamo.estado, "devuelto");
    assert.equal(devuelto.body.prestamo.fecha_devolucion, hoyEnLima());
    assert.equal(await disponibles(lector.token, libro.id), 1);
  });

  it("no permite aprobar dos veces ni devolver un pendiente", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const libro = await crearLibro({ cantidad: 2 });
    const { body } = await solicitar(lector, libro.id);
    const id = body.prestamo.id;

    assert.equal(
      (
        await api.put(`/api/v1/prestamos/${id}/devolver`, {
          token: admin.token,
        })
      ).status,
      400,
    );
    await api
      .put(`/api/v1/prestamos/${id}/aprobar`, { token: admin.token })
      .expect(200);
    assert.equal(
      (await api.put(`/api/v1/prestamos/${id}/aprobar`, { token: admin.token }))
        .status,
      400,
    );
  });
});

describe("solicitudes", () => {
  it("rechaza un libro sin ejemplares, inexistente o inválido", async () => {
    const lector = await crearLector();
    const agotado = await crearLibro({ cantidad: 0 });

    assert.equal((await solicitar(lector, agotado.id)).status, 400);
    const inexistente = await solicitar(lector, 999999);
    assert.equal(inexistente.status, 404);
    assert.equal(inexistente.body.mensaje, "El libro no existe");
    const invalido = await solicitar(lector, "abc");
    assert.equal(invalido.status, 400);
    assert.equal(invalido.body.mensaje, "Indica un libro válido");
  });

  it("no permite dos solicitudes activas del mismo libro", async () => {
    const lector = await crearLector();
    const libro = await crearLibro({ cantidad: 5 });
    await solicitar(lector, libro.id);
    assert.equal((await solicitar(lector, libro.id)).status, 409);
  });

  it("con 8 solicitudes simultáneas crea una sola", async () => {
    const lector = await crearLector();
    const libro = await crearLibro({ cantidad: 5 });

    const respuestas = await Promise.all(
      Array.from({ length: 8 }, () => solicitar(lector, libro.id)),
    );
    const estados = respuestas.map((r) => r.status);
    assert.equal(estados.filter((s) => s === 201).length, 1);
    assert.equal(estados.filter((s) => s === 409).length, 7);

    const [{ activos }] = await bd.consultar(
      "SELECT COUNT(*) AS activos FROM prestamos WHERE libro_id = ? AND estado IN ('pendiente', 'prestado')",
      [libro.id],
    );
    assert.equal(Number(activos), 1);
  });

  it("solo los lectores solicitan y solo los admins aprueban", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const libro = await crearLibro();

    assert.equal((await solicitar(admin, libro.id)).status, 403);
    const { body } = await solicitar(lector, libro.id);
    const aprobar = await api.put(
      `/api/v1/prestamos/${body.prestamo.id}/aprobar`,
      {
        token: lector.token,
      },
    );
    assert.equal(aprobar.status, 403);
  });
});

describe("aprobaciones", () => {
  it("aprobar a la vez dos solicitudes del último ejemplar presta solo uno", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro({ cantidad: 1 });
    const ids = [];
    for (const lector of [await crearLector(), await crearLector()]) {
      ids.push((await solicitar(lector, libro.id)).body.prestamo.id);
    }

    const respuestas = await Promise.all(
      ids.map((id) =>
        api.put(`/api/v1/prestamos/${id}/aprobar`, { token: admin.token }),
      ),
    );
    assert.deepEqual(respuestas.map((r) => r.status).sort(), [200, 400]);
  });

  it("responde 404 si el préstamo no existe", async () => {
    const admin = await crearAdmin();
    const res = await api.put("/api/v1/prestamos/999999/aprobar", {
      token: admin.token,
    });
    assert.equal(res.status, 404);
    assert.equal(res.body.mensaje, "Préstamo no encontrado");
  });
});

describe("GET /prestamos", () => {
  it("el lector ve los suyos y el admin todos", async () => {
    const admin = await crearAdmin();
    const ana = await crearLector();
    const beto = await crearLector();
    const libro = await crearLibro({ cantidad: 2 });
    await solicitar(ana, libro.id);
    await solicitar(beto, libro.id);

    const deAna = await api.get("/api/v1/prestamos", { token: ana.token });
    assert.deepEqual(
      deAna.body.datos.map((p) => p.Usuario.id),
      [ana.id],
    );
    const todos = await api.get("/api/v1/prestamos", { token: admin.token });
    assert.equal(todos.body.datos.length, 2);
  });
});
