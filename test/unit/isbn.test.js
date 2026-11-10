const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { normalizarIsbn, isbnValido } = require("../../utils/isbn");
const libros = require("../../validators/books");

describe("ISBN", () => {
  it("quita guiones y espacios y pasa la X a mayúscula", () => {
    assert.equal(normalizarIsbn("978-0-06-088328-7"), "9780060883287");
    assert.equal(normalizarIsbn("0 8044 2957 x"), "080442957X");
  });

  it("acepta ISBN reales de 10 y 13 dígitos, incluida la X final", () => {
    for (const isbn of ["9780060883287", "0132350882", "080442957X"]) {
      assert.ok(isbnValido(isbn), isbn);
    }
  });

  it("rechaza un dígito de control equivocado o un largo inválido", () => {
    for (const isbn of [
      "9780060883288",
      "0132350883",
      "12345",
      "978006088328X",
    ]) {
      assert.equal(isbnValido(isbn), false, isbn);
    }
  });
});

describe("esquema de libros con datos bibliográficos", () => {
  const base = { titulo: "T", autor: "A", cantidad: 1 };

  it("normaliza ISBN, editorial y año", () => {
    const resultado = libros.crear.safeParse({
      ...base,
      isbn: "978-0-06-088328-7",
      editorial: " Sudamericana ",
      anio: "1967",
    });
    assert.ok(resultado.success);
    assert.equal(resultado.data.isbn, "9780060883287");
    assert.equal(resultado.data.editorial, "Sudamericana");
    assert.equal(resultado.data.anio, 1967);
  });

  it("un campo vacío del formulario queda en blanco", () => {
    const resultado = libros.actualizar.safeParse({ isbn: "", anio: "" });
    assert.deepEqual(resultado.data, { isbn: null, anio: null });
  });

  it("rechaza un ISBN inválido y un año imposible", () => {
    const isbn = libros.crear.safeParse({ ...base, isbn: "978-0-06-088328-8" });
    assert.match(isbn.error.issues[0].message, /ISBN no es válido/);
    const anio = libros.crear.safeParse({ ...base, anio: 3000 });
    assert.match(anio.error.issues[0].message, /El año debe estar entre/);
  });
});
