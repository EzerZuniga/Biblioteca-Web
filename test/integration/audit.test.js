const bd = require("../helpers/db");
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const api = require("../helpers/api");
const { crearLector, crearAdmin, crearLibro } = require("../helpers/fixtures");
const usuarios = require("../../services/users");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());
beforeEach(() => bd.vaciarTablas());

const registros = (accion) =>
  bd.consultar(
    "SELECT usuario_id, entidad, entidad_id, detalles FROM auditoria WHERE accion = ? ORDER BY id",
    [accion],
  );

describe("auditoría de libros", () => {
  it("registra quién creó, editó y eliminó un libro, con los cambios", async () => {
    const admin = await crearAdmin();
    const creado = await api.post("/api/v1/libros", {
      token: admin.token,
      cuerpo: { titulo: "Rayuela", autor: "Cortázar", cantidad: 2 },
    });
    const id = creado.body.libro.id;
    await api.put(`/api/v1/libros/${id}`, {
      token: admin.token,
      cuerpo: { titulo: "Rayuela", cantidad: 3, editorial: "Sudamericana" },
    });
    await api.delete(`/api/v1/libros/${id}`, { token: admin.token });

    const [alta] = await registros("libro.creado");
    assert.deepEqual(alta, {
      usuario_id: admin.id,
      entidad: "libro",
      entidad_id: id,
      detalles: { titulo: "Rayuela" },
    });
    const [edicion] = await registros("libro.actualizado");
    assert.deepEqual(edicion.detalles.cambios, {
      cantidad: { antes: 2, despues: 3 },
      editorial: { antes: null, despues: "Sudamericana" },
    });
    assert.equal((await registros("libro.eliminado")).length, 1);
  });

  it("una edición que no cambia nada no deja registro", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro({ titulo: "Igual" });
    await api.put(`/api/v1/libros/${libro.id}`, {
      token: admin.token,
      cuerpo: { titulo: "Igual" },
    });
    assert.equal((await registros("libro.actualizado")).length, 0);
  });

  it("una acción que falla no deja registro", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const libro = await crearLibro({ cantidad: 1 });
    const { body } = await api.post("/api/v1/prestamos", {
      token: lector.token,
      cuerpo: { libro_id: libro.id },
    });
    await api.put(`/api/v1/prestamos/${body.prestamo.id}/aprobar`, {
      token: admin.token,
    });

    const res = await api.put(`/api/v1/libros/${libro.id}`, {
      token: admin.token,
      cuerpo: { titulo: "Otro título", cantidad: 0 },
    });
    assert.equal(res.status, 409);
    assert.equal((await registros("libro.actualizado")).length, 0);
  });
});

describe("auditoría de préstamos", () => {
  it("registra cada paso con quién lo dio", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    const libro = await crearLibro({ titulo: "Ficciones", cantidad: 2 });
    const pedir = () =>
      api.post("/api/v1/prestamos", {
        token: lector.token,
        cuerpo: { libro_id: libro.id },
      });
    const accion = (quien, id, nombre, cuerpo) =>
      api.put(`/api/v1/prestamos/${id}/${nombre}`, {
        token: quien.token,
        cuerpo,
      });

    const primero = (await pedir()).body.prestamo;
    await accion(admin, primero.id, "rechazar", { motivo: "Sin stock" });
    const segundo = (await pedir()).body.prestamo;
    await accion(lector, segundo.id, "cancelar");
    const tercero = (await pedir()).body.prestamo;
    await accion(admin, tercero.id, "aprobar");
    await accion(admin, tercero.id, "devolver");

    const actores = await bd.consultar(
      "SELECT accion, usuario_id FROM auditoria WHERE entidad = 'prestamo' ORDER BY id",
    );
    assert.deepEqual(actores, [
      { accion: "prestamo.solicitado", usuario_id: lector.id },
      { accion: "prestamo.rechazado", usuario_id: admin.id },
      { accion: "prestamo.solicitado", usuario_id: lector.id },
      { accion: "prestamo.cancelado", usuario_id: lector.id },
      { accion: "prestamo.solicitado", usuario_id: lector.id },
      { accion: "prestamo.aprobado", usuario_id: admin.id },
      { accion: "prestamo.devuelto", usuario_id: admin.id },
    ]);
    const [rechazo] = await registros("prestamo.rechazado");
    assert.deepEqual(rechazo.detalles, {
      codigo: primero.codigo,
      libro: "Ficciones",
      motivo: "Sin stock",
    });
    const [aprobacion] = await registros("prestamo.aprobado");
    assert.match(aprobacion.detalles.fechaLimite, /^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("auditoría de usuarios", () => {
  it("registra el registro, los cambios sin la contraseña y la eliminación", async () => {
    const admin = await crearAdmin();
    const lector = await crearLector();
    await api.put(`/api/v1/usuarios/${lector.id}`, {
      token: admin.token,
      cuerpo: { nombre: "Nuevo nombre", password: "claveNueva9" },
    });
    await api.delete(`/api/v1/usuarios/${lector.id}`, { token: admin.token });

    // Tras eliminar la cuenta, el registro sigue: identifica al usuario por su
    // id y su email, pero ya no puede apuntar a una cuenta que no existe.
    const [alta] = await registros("usuario.registrado");
    assert.equal(alta.entidad_id, lector.id);
    assert.equal(alta.usuario_id, null);
    assert.equal(alta.detalles.email, lector.email);
    const [edicion] = await registros("usuario.actualizado");
    assert.deepEqual(edicion.detalles.cambios, {
      nombre: { antes: lector.nombre, despues: "Nuevo nombre" },
      password: "cambiada",
    });
    assert.doesNotMatch(JSON.stringify(edicion), /claveNueva9|\$2b\$/);
    const [baja] = await registros("usuario.eliminado");
    assert.equal(baja.detalles.email, lector.email);
  });

  it("el registro sobrevive aunque se elimine a quien hizo la acción", async () => {
    const admin = await crearAdmin();
    const otroAdmin = await crearAdmin();
    await api.post("/api/v1/libros", {
      token: otroAdmin.token,
      cuerpo: { titulo: "Huérfano", autor: "X", cantidad: 1 },
    });
    await api.delete(`/api/v1/usuarios/${otroAdmin.id}`, {
      token: admin.token,
    });

    const [alta] = await registros("libro.creado");
    assert.equal(alta.usuario_id, null);
    assert.equal(alta.detalles.titulo, "Huérfano");
  });

  it("la consola deja constancia al cambiar la clave del admin", async () => {
    await usuarios.guardarAdmin(
      { nombre: "Jefa", email: "jefa@x.com", password: "ClaveJefa123" },
      { cambiarNombre: false },
    );
    const [registro] = await registros("usuario.admin_guardado");
    assert.equal(registro.usuario_id, null);
    assert.deepEqual(registro.detalles, {
      email: "jefa@x.com",
      resultado: "creado",
    });
  });
});

describe("GET /api/v1/auditoria", () => {
  it("el admin ve la actividad con el nombre de quien la hizo y filtra", async () => {
    const admin = await crearAdmin();
    await crearLibro();
    await api.post("/api/v1/libros", {
      token: admin.token,
      cuerpo: { titulo: "Visible", autor: "X", cantidad: 1 },
    });

    const res = await api.get("/api/v1/auditoria?entidad=libro", {
      token: admin.token,
    });
    assert.equal(res.status, 200);
    const visible = res.body.datos.find((r) => r.detalles.titulo === "Visible");
    assert.equal(visible.actor.nombre, admin.nombre);
    assert.ok(visible.creado_en);
    assert.ok(res.body.datos.every((r) => r.entidad === "libro"));
  });

  it("es solo para administradores", async () => {
    const lector = await crearLector();
    const res = await api.get("/api/v1/auditoria", { token: lector.token });
    assert.equal(res.status, 403);
  });
});

describe("marcas de tiempo", () => {
  it("cada libro informa cuándo se creó y cuándo se modificó", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro();
    const res = await api.put(`/api/v1/libros/${libro.id}`, {
      token: admin.token,
      cuerpo: { titulo: "Cambiado" },
    });
    assert.ok(Date.parse(res.body.libro.creado_en));
    assert.ok(Date.parse(res.body.libro.actualizado_en));
  });
});
