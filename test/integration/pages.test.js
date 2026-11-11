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
      /["'`(]\/((?:[\w-]+\/)*[\w-]+\.(?:html|js|css|png|jpg|svg|webp))/g;
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

describe("reglas de diseño", () => {
  const leer = (archivo) => fs.readFileSync(path.join(PUBLIC, archivo), "utf8");

  // Quita los bloques @media que exigen prefers-reduced-motion: no-preference.
  // Se cuentan llaves porque esos bloques llevan reglas anidadas.
  const sinBloquesDeMovimiento = (css) => {
    const inicio = /@media[^{]*prefers-reduced-motion:\s*no-preference[^{]*\{/;
    let resto = css;
    let encontrado;
    while ((encontrado = inicio.exec(resto))) {
      let nivel = 1;
      let fin = encontrado.index + encontrado[0].length;
      for (; fin < resto.length && nivel > 0; fin++) {
        if (resto[fin] === "{") nivel++;
        else if (resto[fin] === "}") nivel--;
      }
      resto = resto.slice(0, encontrado.index) + resto.slice(fin);
    }
    return resto;
  };

  it("solo hay transiciones si el sistema no pide reducir movimiento", () => {
    const css = leer("css/styles.css");
    assert.doesNotMatch(css, /\banimation\s*:|@keyframes/);
    assert.doesNotMatch(sinBloquesDeMovimiento(css), /\btransition\s*:/);
  });

  it("cada página cumple lo básico de accesibilidad y adaptabilidad", () => {
    for (const pagina of archivosDe(".", ".html")) {
      const html = leer(pagina);
      assert.match(html, /<html lang="es">/, `${pagina}: idioma`);
      assert.match(
        html,
        /<meta name="viewport" content="width=device-width, initial-scale=1"/,
        `${pagina}: viewport`,
      );
      assert.match(html, /<title>[^<]+<\/title>/, `${pagina}: título`);
      assert.match(html, /rel="icon"/, `${pagina}: favicon`);
      assert.doesNotMatch(html, /<script>/, `${pagina}: script en línea`);
      if (pagina !== "index.html") {
        assert.match(
          html,
          /<main [^>]*id="principal"/,
          `${pagina}: destino del enlace "Saltar al contenido"`,
        );
      }
    }
  });

  it("cada imagen del HTML declara su tamaño para no mover la página al cargar", () => {
    const fuentes = [...archivosDe(".", ".html"), "js/api.js"];
    for (const fuente of fuentes) {
      for (const [img] of leer(fuente).matchAll(/<img [^>]*>/g)) {
        assert.match(img, /width="\d+"/, `${fuente}: ${img}`);
        assert.match(img, /height="\d+"/, `${fuente}: ${img}`);
        assert.match(img, /alt="/, `${fuente}: ${img}`);
      }
    }
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
