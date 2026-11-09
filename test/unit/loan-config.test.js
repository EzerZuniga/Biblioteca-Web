const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const CONFIG = path.join(__dirname, "../../config/loans");

const cargar = (variables) =>
  spawnSync(
    process.execPath,
    ["-e", `console.log(JSON.stringify(require(${JSON.stringify(CONFIG)})))`],
    { env: { ...process.env, ...variables }, encoding: "utf8" },
  );

describe("reglas de préstamo configurables", () => {
  it("usan 14 días y 3 activos por defecto", () => {
    const resultado = cargar({ DIAS_PRESTAMO: "", MAX_PRESTAMOS_ACTIVOS: "" });
    assert.deepEqual(JSON.parse(resultado.stdout), {
      DIAS_PRESTAMO: 14,
      MAX_PRESTAMOS_ACTIVOS: 3,
    });
  });

  it("toman los valores de las variables de entorno", () => {
    const resultado = cargar({
      DIAS_PRESTAMO: "7",
      MAX_PRESTAMOS_ACTIVOS: "5",
    });
    assert.deepEqual(JSON.parse(resultado.stdout), {
      DIAS_PRESTAMO: 7,
      MAX_PRESTAMOS_ACTIVOS: 5,
    });
  });

  it("un valor inválido impide arrancar con un mensaje claro", () => {
    for (const valor of ["0", "abc", "1.5", "400"]) {
      const resultado = cargar({ DIAS_PRESTAMO: valor });
      assert.notEqual(resultado.status, 0, valor);
      assert.match(resultado.stderr, /DIAS_PRESTAMO debe ser un número entero/);
    }
  });
});
