const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const auth = require("../../validators/auth");
const libros = require("../../validators/books");
const usuarios = require("../../validators/users");
const prestamos = require("../../validators/loans");
const { paramId } = require("../../validators/common");

const valido = (esquema, dato) => {
  const resultado = esquema.safeParse(dato);
  assert.ok(resultado.success, JSON.stringify(resultado.error?.issues));
  return resultado.data;
};

const primerError = (esquema, dato) => {
  const resultado = esquema.safeParse(dato);
  assert.equal(resultado.success, false, "se esperaba un error");
  return resultado.error.issues[0].message;
};

const CANTIDAD_INVALIDA =
  "La cantidad de ejemplares debe ser un número entero de 0 o más";

describe("esquema de registro", () => {
  const base = { nombre: "Ana", email: "ana@mail.com", password: "secreto1" };

  it("normaliza los datos y descarta campos desconocidos", () => {
    const datos = valido(auth.registro, {
      nombre: "  Ana ",
      email: " ANA@Mail.com ",
      password: "secreto1",
      rol: "admin",
    });
    assert.deepEqual(datos, base);
  });

  it("explica cada campo inválido", () => {
    const casos = [
      [{ ...base, nombre: undefined }, "El nombre es obligatorio"],
      [{ ...base, nombre: "   " }, "El nombre no puede estar vacío"],
      [{ ...base, nombre: 123 }, "El nombre debe ser texto"],
      [
        { ...base, nombre: "x".repeat(101) },
        "El nombre admite como máximo 100 caracteres",
      ],
      [
        { ...base, email: "no-es-email" },
        "El email no tiene un formato válido",
      ],
      [
        { ...base, password: "123" },
        "La contraseña debe tener al menos 6 caracteres",
      ],
      // bcrypt ignora lo que pase de 72 bytes; "ñ" ocupa 2.
      [
        { ...base, password: "ñ".repeat(40) },
        "La contraseña es demasiado larga",
      ],
    ];
    for (const [dato, mensaje] of casos) {
      assert.equal(primerError(auth.registro, dato), mensaje);
    }
  });
});

describe("esquema de login", () => {
  it("normaliza el email", () => {
    assert.deepEqual(
      valido(auth.login, { email: " X@Y.COM ", password: "p" }),
      {
        email: "x@y.com",
        password: "p",
      },
    );
  });

  it("no revela qué campo falta", () => {
    assert.equal(
      primerError(auth.login, {}),
      "Ingresa tu email y tu contraseña",
    );
  });
});

describe("esquemas de libros", () => {
  it("convierte la cantidad de texto y usa General sin categoría", () => {
    assert.deepEqual(
      valido(libros.crear, { titulo: " T ", autor: "A", cantidad: "3" }),
      { titulo: "T", autor: "A", categoria: "General", cantidad: 3 },
    );
    assert.equal(
      valido(libros.crear, {
        titulo: "T",
        autor: "A",
        categoria: "  ",
        cantidad: 0,
      }).categoria,
      "General",
    );
  });

  it("rechaza cantidades que no son enteros válidos", () => {
    for (const cantidad of ["", "1.5", -1, true, 1e12, "abc"]) {
      assert.equal(
        primerError(libros.crear, { titulo: "T", autor: "A", cantidad }),
        CANTIDAD_INVALIDA,
        `cantidad ${JSON.stringify(cantidad)}`,
      );
    }
  });

  it("en una edición solo deja los campos enviados", () => {
    assert.deepEqual(valido(libros.actualizar, {}), {});
    assert.deepEqual(valido(libros.actualizar, { titulo: " Nuevo " }), {
      titulo: "Nuevo",
    });
    assert.deepEqual(valido(libros.actualizar, { categoria: "" }), {
      categoria: "General",
    });
    assert.equal(
      primerError(libros.actualizar, { titulo: "" }),
      "El título no puede estar vacío",
    );
  });

  it("rechaza una búsqueda repetida en la URL", () => {
    assert.equal(
      primerError(libros.busqueda, { titulo: ["a", "b"] }),
      "La búsqueda debe ser texto",
    );
  });
});

describe("esquemas de usuarios", () => {
  it("ignora la contraseña vacía al editar", () => {
    assert.deepEqual(
      valido(usuarios.actualizar, { password: "", nombre: "B" }),
      {
        nombre: "B",
      },
    );
  });

  it("rechaza un rol inventado", () => {
    assert.equal(
      primerError(usuarios.actualizar, { rol: "jefe" }),
      "Rol no válido",
    );
  });

  it("exige una clave fuerte al administrador", () => {
    assert.deepEqual(
      valido(usuarios.admin, { email: "A@B.com", password: "ClaveLarga12" }),
      { email: "a@b.com", password: "ClaveLarga12", nombre: "Administrador" },
    );
    assert.equal(
      primerError(usuarios.admin, { email: "a@b.com", password: "Corta1" }),
      "La contraseña debe tener al menos 10 caracteres",
    );
    assert.equal(
      primerError(usuarios.admin, {
        email: "a@b.com",
        password: "sololetraslargas",
      }),
      "La contraseña debe combinar letras y números",
    );
  });
});

describe("esquemas de préstamos e identificadores", () => {
  it("convierte libro_id y el id de la URL", () => {
    assert.deepEqual(valido(prestamos.crear, { libro_id: "7" }), {
      libro_id: 7,
    });
    assert.deepEqual(valido(paramId, { id: "12" }), { id: 12 });
  });

  it("rechaza identificadores inválidos", () => {
    assert.equal(
      primerError(prestamos.crear, { libro_id: 0 }),
      "Indica un libro válido",
    );
    assert.equal(primerError(prestamos.crear, {}), "Indica un libro válido");
    assert.equal(
      primerError(paramId, { id: "abc" }),
      "El identificador no es válido",
    );
  });
});
