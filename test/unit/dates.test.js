// Simula un servidor en UTC, como Railway, antes de cargar el módulo.
process.env.TZ = "UTC";
delete process.env.ZONA_HORARIA;

const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const { fechaLocal, marcaLocal } = require("../../utils/dates");

describe("fechaLocal en America/Lima con el servidor en UTC", () => {
  const casos = [
    ["2026-11-08T23:59:00Z", "2026-11-08", "18:59 en Lima"],
    [
      "2026-11-09T00:30:00Z",
      "2026-11-08",
      "19:30 en Lima: en UTC ya es el día 9",
    ],
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
      [
        "-e",
        `require(${JSON.stringify(path.join(__dirname, "../../utils/dates"))})`,
      ],
      {
        env: { ...process.env, ZONA_HORARIA: "Lima/Inventada" },
        encoding: "utf8",
      },
    );
    assert.notEqual(resultado.status, 0);
    assert.match(
      resultado.stderr,
      /ZONA_HORARIA no es válida: "Lima\/Inventada"/,
    );
  });
});

describe("sumarDias y diasEntre", () => {
  const { sumarDias, diasEntre } = require("../../utils/dates");

  it("cruzan meses, años y febrero bisiesto", () => {
    assert.equal(sumarDias("2026-11-25", 14), "2026-12-09");
    assert.equal(sumarDias("2026-12-25", 14), "2027-01-08");
    assert.equal(sumarDias("2028-02-20", 14), "2028-03-05");
    assert.equal(sumarDias("2026-03-01", -1), "2026-02-28");
  });

  it("cuentan los días entre dos fechas", () => {
    assert.equal(diasEntre("2026-12-25", "2027-01-08"), 14);
    assert.equal(diasEntre("2026-01-10", "2026-01-10"), 0);
    assert.equal(diasEntre("2026-01-10", "2026-01-07"), -3);
  });
});
