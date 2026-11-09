// Simula un servidor en UTC, como Railway, antes de cargar el módulo.
process.env.TZ = "UTC";
delete process.env.ZONA_HORARIA;

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { fechaLocal, marcaLocal } = require("../../utils/fechas");

describe("fechaLocal en America/Lima con el servidor en UTC", () => {
  const casos = [
    ["2026-11-08T23:59:00Z", "2026-11-08", "18:59 en Lima"],
    ["2026-11-09T00:30:00Z", "2026-11-08", "19:30 en Lima: en UTC ya es el día 9"],
    ["2026-11-09T04:59:00Z", "2026-11-08", "23:59 en Lima"],
    ["2026-11-09T05:00:00Z", "2026-11-09", "medianoche en Lima"],
    ["2027-01-01T04:00:00Z", "2026-12-31", "año nuevo en UTC, 31 en Lima"],
  ];
  for (const [utc, esperado, descripcion] of casos) {
    it(descripcion, () => {
      assert.equal(fechaLocal(new Date(utc)), esperado);
    });
  }
});

describe("marcaLocal", () => {
  it("usa la hora de Lima en formato AAAAMMDD-HHMM", () => {
    assert.equal(marcaLocal(new Date("2026-11-09T00:05:00Z")), "20261108-1905");
  });
});

describe("ZONA_HORARIA inválida", () => {
  it("impide cargar el módulo con un mensaje claro", () => {
    const resultado = spawnSync(
      process.execPath,
      ["-e", `require(${JSON.stringify(path.join(__dirname, "../../utils/fechas"))})`],
      { env: { ...process.env, ZONA_HORARIA: "Lima/Inventada" }, encoding: "utf8" },
    );
    assert.notEqual(resultado.status, 0);
    assert.match(resultado.stderr, /ZONA_HORARIA no es válida: "Lima\/Inventada"/);
  });
});
