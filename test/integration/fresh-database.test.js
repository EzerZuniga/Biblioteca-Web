// Una base vacía, como un Railway recién creado: la app debe dejarla lista
// sin cuentas con contraseña conocida.
const bd = require("../helpers/db");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { sequelize } = require("../../models");
const prepararBase = require("../../database/prepare");
const auth = require("../../services/auth");

const RAIZ = path.join(__dirname, "../..");

const conAdminEnEntorno = async (variables, fn) => {
  Object.assign(process.env, variables);
  try {
    return await fn();
  } finally {
    for (const nombre of Object.keys(variables)) delete process.env[nombre];
  }
};

before(async () => {
  await bd.crearBaseDePrueba({ preparar: false });
  await conAdminEnEntorno(
    { ADMIN_EMAIL: "jefa@prueba.com", ADMIN_PASSWORD: "ClaveInicial123" },
    () => prepararBase(sequelize),
  );
});
after(() => bd.borrarBaseDePrueba());

describe("preparar una base vacía", () => {
  it("aplica las migraciones y carga los libros de ejemplo", async () => {
    const migraciones = await bd.consultar(
      "SELECT nombre FROM migraciones ORDER BY nombre",
    );
    assert.deepEqual(
      migraciones.map((m) => m.nombre),
      [
        "001-quantity-is-total.js",
        "002-token-version.js",
        "003-protect-loan-history.js",
        "004-loan-due-dates-and-states.js",
        "005-audit-and-book-details.js",
        "006-password-resets.js",
      ],
    );
    const [{ libros }] = await bd.consultar(
      "SELECT COUNT(*) AS libros FROM libros",
    );
    assert.equal(Number(libros), 8);
  });

  it("crea el admin desde las variables y ninguna cuenta pública", async () => {
    const usuarios = await bd.consultar("SELECT email, rol FROM usuarios");
    assert.deepEqual(usuarios, [{ email: "jefa@prueba.com", rol: "admin" }]);
  });

  it("protege el historial: sin borrado en cascada y sin cantidades negativas", async () => {
    const reglas = await bd.consultar(
      `SELECT DELETE_RULE AS regla FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'prestamos'`,
    );
    assert.deepEqual(
      reglas.map((r) => r.regla),
      ["RESTRICT", "RESTRICT"],
    );
    await assert.rejects(
      bd.consultar("UPDATE libros SET cantidad = -1 LIMIT 1"),
      (error) => error.parent?.code === "ER_CHECK_CONSTRAINT_VIOLATED",
    );
  });

  it("volver a preparar no cambia un admin existente ni duplica datos", async () => {
    await conAdminEnEntorno(
      { ADMIN_EMAIL: "jefa@prueba.com", ADMIN_PASSWORD: "OtraDistinta999" },
      () => prepararBase(sequelize),
    );
    const sesion = await auth.iniciarSesion({
      email: "jefa@prueba.com",
      password: "ClaveInicial123",
    });
    assert.ok(sesion.token);
    const [{ libros }] = await bd.consultar(
      "SELECT COUNT(*) AS libros FROM libros",
    );
    assert.equal(Number(libros), 8);
  });
});

describe("comando create-admin", () => {
  const crearAdmin = (variables) =>
    spawnSync(process.execPath, ["scripts/create-admin.js"], {
      cwd: RAIZ,
      env: { ...process.env, ...variables },
      encoding: "utf8",
    });

  it("rechaza una clave débil sin tocar la base", () => {
    const resultado = crearAdmin({
      ADMIN_EMAIL: "a@prueba.com",
      ADMIN_PASSWORD: "corta",
    });
    assert.notEqual(resultado.status, 0);
    assert.match(resultado.stderr, /al menos 10 caracteres/);
  });

  it("cambia la clave y cierra la sesión abierta con la anterior", async () => {
    const vieja = await auth.iniciarSesion({
      email: "jefa@prueba.com",
      password: "ClaveInicial123",
    });

    const resultado = crearAdmin({
      ADMIN_EMAIL: "jefa@prueba.com",
      ADMIN_PASSWORD: "ClaveNueva2026",
    });
    assert.equal(resultado.status, 0, resultado.stderr);
    assert.match(resultado.stdout, /Administrador actualizado/);

    await assert.rejects(auth.sesionDesdeToken(vieja.token));
    const nueva = await auth.iniciarSesion({
      email: "jefa@prueba.com",
      password: "ClaveNueva2026",
    });
    assert.ok(nueva.token);
  });
});
