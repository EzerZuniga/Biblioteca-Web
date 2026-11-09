const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const api = require("../helpers/api");
const { PAGINAS_RENOMBRADAS } = require("../../routes/legacyRedirects");

const PUBLIC = path.join(__dirname, "../../public");

const archivosDe = (carpeta, extension) =>
  fs
    .readdirSync(path.join(PUBLIC, carpeta))
    .filter((archivo) => archivo.endsWith(extension))
    .map((archivo) => path.join(carpeta, archivo));

describe("páginas del frontend", () => {
  it("cada página HTML se sirve", async () => {
    for (const pagina of archivosDe(".", ".html")) {
      const res = await api.get(`/${path.basename(pagina)}`);
      assert.equal(res.status, 200, pagina);
    }
  });

  it("todo enlace interno apunta a un archivo que existe", () => {
    const fuentes = [...archivosDe(".", ".html"), ...archivosDe("js", ".js")];
    const enlace =
      /["'`(]\/((?:[\w-]+\/)*[\w-]+\.(?:html|js|css|png|jpg|svg))/g;
    const rotos = [];

    for (const fuente of fuentes) {
      const contenido = fs.readFileSync(path.join(PUBLIC, fuente), "utf8");
      for (const [, destino] of contenido.matchAll(enlace)) {
        if (!fs.existsSync(path.join(PUBLIC, destino))) {
          rotos.push(`${fuente} -> /${destino}`);
        }
      }
    }
    assert.deepEqual(rotos, []);
  });
});

describe("direcciones anteriores en español", () => {
  it("redirigen de forma permanente y conservan la consulta", async () => {
    const res = await api.get("/registro.html?registrado=1");
    assert.equal(res.status, 301);
    assert.equal(res.headers.location, "/register.html?registrado=1");
  });

  it("cada una lleva a una página que existe", () => {
    for (const nueva of Object.values(PAGINAS_RENOMBRADAS)) {
      assert.ok(fs.existsSync(path.join(PUBLIC, nueva)), nueva);
    }
  });
});
