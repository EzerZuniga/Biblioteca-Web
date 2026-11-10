const bd = require("../helpers/db");
const { describe, it, before, after, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const api = require("../helpers/api");
const { crearLector, crearAdmin, crearLibro } = require("../helpers/fixtures");
const prestamos = require("../../services/loans");

before(() => bd.crearBaseDePrueba());
after(() => bd.borrarBaseDePrueba());
beforeEach(() => bd.vaciarTablas());

const prestar = async (libroId) => {
  const lector = await crearLector();
  const prestamo = await prestamos.solicitar(lector.id, libroId);
  await prestamos.aprobar(prestamo.id);
};

describe("GET /libros", () => {
  it("informa total, prestados y disponibles", async () => {
    const lector = await crearLector();
    const libro = await crearLibro({ cantidad: 3 });
    await prestar(libro.id);

    const res = await api.get("/api/v1/libros", { token: lector.token });
    assert.equal(res.status, 200);
    assert.deepEqual(
      {
        cantidad: res.body.datos[0].cantidad,
        prestados: res.body.datos[0].prestados,
        disponibles: res.body.datos[0].disponibles,
      },
      { cantidad: 3, prestados: 1, disponibles: 2 },
    );
  });

  it("busca % y _ como texto literal, no como comodines", async () => {
    const lector = await crearLector();
    const raro = await crearLibro({ titulo: "Cien%Raro" });
    await crearLibro({ titulo: "Otro libro" });

    const porcentaje = await api.get(
      `/api/v1/libros?titulo=${encodeURIComponent("%")}`,
      {
        token: lector.token,
      },
    );
    assert.deepEqual(
      porcentaje.body.datos.map((l) => l.id),
      [raro.id],
    );

    const guion = await api.get(
      `/api/v1/libros?titulo=${encodeURIComponent("_")}`,
      {
        token: lector.token,
      },
    );
    assert.deepEqual(guion.body.datos, []);
  });

  it("rechaza una búsqueda repetida en la URL", async () => {
    const lector = await crearLector();
    const res = await api.get("/api/v1/libros?titulo=a&titulo=b", {
      token: lector.token,
    });
    assert.equal(res.status, 400);
  });
});

describe("POST /libros", () => {
  it("crea con la cantidad enviada como texto y categoría General", async () => {
    const admin = await crearAdmin();
    const res = await api.post("/api/v1/libros", {
      token: admin.token,
      cuerpo: { titulo: " Nuevo ", autor: "Z", categoria: "", cantidad: "2" },
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.libro.titulo, "Nuevo");
    assert.equal(res.body.libro.categoria, "General");
    assert.equal(res.body.libro.disponibles, 2);
  });

  it("solo lo puede hacer un administrador", async () => {
    const lector = await crearLector();
    const res = await api.post("/api/v1/libros", {
      token: lector.token,
      cuerpo: { titulo: "T", autor: "A", cantidad: 1 },
    });
    assert.equal(res.status, 403);
  });
});

describe("PUT /libros/:id", () => {
  it("editar solo el título conserva la categoría y la cantidad", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro({ categoria: "Ensayo", cantidad: 2 });
    const res = await api.put(`/api/v1/libros/${libro.id}`, {
      token: admin.token,
      cuerpo: { titulo: "Título nuevo" },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.libro.categoria, "Ensayo");
    assert.equal(res.body.libro.cantidad, 2);
  });

  it("reenviar la cantidad del formulario no inventa ejemplares", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro({ cantidad: 1 });
    await prestar(libro.id);

    const res = await api.put(`/api/v1/libros/${libro.id}`, {
      token: admin.token,
      cuerpo: {
        titulo: "Corregido",
        autor: libro.autor,
        categoria: "General",
        cantidad: 1,
      },
    });
    assert.equal(res.status, 200);
    assert.equal(res.body.libro.disponibles, 0);
  });

  it("no deja bajar el total por debajo de los prestados", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro({ cantidad: 1 });
    await prestar(libro.id);

    const res = await api.put(`/api/v1/libros/${libro.id}`, {
      token: admin.token,
      cuerpo: { cantidad: 0 },
    });
    assert.equal(res.status, 409);
  });

  it("valida el id de la URL y responde 404 si no existe", async () => {
    const admin = await crearAdmin();
    const invalido = await api.put("/api/v1/libros/abc", {
      token: admin.token,
      cuerpo: {},
    });
    assert.equal(invalido.status, 400);
    assert.equal(invalido.body.mensaje, "El identificador no es válido");

    const inexistente = await api.put("/api/v1/libros/999999", {
      token: admin.token,
      cuerpo: {},
    });
    assert.equal(inexistente.status, 404);
    assert.equal(inexistente.body.mensaje, "Libro no encontrado");
  });
});

describe("DELETE /libros/:id", () => {
  it("elimina un libro sin préstamos", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro();
    const res = await api.delete(`/api/v1/libros/${libro.id}`, {
      token: admin.token,
    });
    assert.equal(res.status, 200);
  });

  it("no elimina un libro con historial de préstamos", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro();
    await prestar(libro.id);
    const res = await api.delete(`/api/v1/libros/${libro.id}`, {
      token: admin.token,
    });
    assert.equal(res.status, 409);
  });
});

describe("datos bibliográficos y búsqueda", () => {
  it("guarda ISBN, editorial y año, y rechaza un ISBN repetido", async () => {
    const admin = await crearAdmin();
    const crear = (titulo) =>
      api.post("/api/v1/libros", {
        token: admin.token,
        cuerpo: {
          titulo,
          autor: "García Márquez",
          isbn: "978-0-06-088328-7",
          editorial: "Harper",
          anio: 2006,
          cantidad: 1,
        },
      });

    const primero = await crear("Cien años de soledad");
    assert.equal(primero.status, 201);
    assert.equal(primero.body.libro.isbn, "9780060883287");
    assert.equal(primero.body.libro.anio, 2006);

    const repetido = await crear("Otra edición");
    assert.equal(repetido.status, 409);
    assert.match(repetido.body.mensaje, /Cien años de soledad/);
  });

  it("busca por título, autor o ISBN con o sin guiones", async () => {
    const lector = await crearLector();
    const libro = await crearLibro({
      titulo: "Cien años de soledad",
      autor: "Gabriel García Márquez",
      isbn: "9780060883287",
    });
    await crearLibro({ titulo: "Otro", autor: "Otra persona" });

    for (const texto of [
      "soledad",
      "márquez",
      "978-0-06-088328-7",
      "0883287",
    ]) {
      const res = await api.get(
        `/api/v1/libros?buscar=${encodeURIComponent(texto)}`,
        { token: lector.token },
      );
      assert.deepEqual(
        res.body.datos.map((l) => l.id),
        [libro.id],
        texto,
      );
    }
  });

  it("un ISBN vacío en la edición lo borra", async () => {
    const admin = await crearAdmin();
    const libro = await crearLibro({ isbn: "0132350882" });
    const res = await api.put(`/api/v1/libros/${libro.id}`, {
      token: admin.token,
      cuerpo: { isbn: "" },
    });
    assert.equal(res.body.libro.isbn, null);
  });
});
