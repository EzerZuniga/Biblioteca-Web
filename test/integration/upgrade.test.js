// Actualizar una base de producción con el arranque completo de la app
// (crear tablas faltantes + migraciones), como ocurre en cada despliegue.
const bd = require("../helpers/db");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const { sequelize } = require("../../models");
const prepararBase = require("../../database/prepare");
const { ESQUEMA_ANTIGUO } = require("../helpers/legacySchema");
const api = require("../helpers/api");

before(async () => {
  await bd.crearBaseDePrueba({ preparar: false });
  const cx = await bd.conectar();
  await cx.query(`USE \`${bd.NOMBRE_BD}\`; ${ESQUEMA_ANTIGUO}`);
  await cx.end();
});
after(() => bd.borrarBaseDePrueba());

describe("arrancar la app sobre una base de una versión anterior", () => {
  it("crea las tablas nuevas y aplica todas las migraciones sin errores", async () => {
    const aplicadas = await prepararBase(sequelize, { datosIniciales: false });
    assert.equal(aplicadas.length, 6);
  });

  it("deja las tablas existentes con su estructura nueva y sus datos", async () => {
    const [prestamo] = await bd.consultar(
      "SELECT estado, fecha_limite FROM prestamos WHERE codigo = 'AAAA0001'",
    );
    assert.deepEqual(prestamo, {
      estado: "prestado",
      fecha_limite: "2026-01-15",
    });

    const tablas = await bd.consultar(
      `SELECT TABLE_NAME AS nombre FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() ORDER BY nombre`,
    );
    assert.deepEqual(
      tablas.map((t) => t.nombre),
      [
        "auditoria",
        "libros",
        "migraciones",
        "prestamos",
        "recuperaciones",
        "usuarios",
      ],
    );
  });

  it("queda lista para atender: el healthcheck responde 200", async () => {
    const res = await api.get("/health");
    assert.equal(res.status, 200);
  });

  it("arrancar otra vez no cambia nada", async () => {
    assert.deepEqual(
      await prepararBase(sequelize, { datosIniciales: false }),
      [],
    );
  });
});
