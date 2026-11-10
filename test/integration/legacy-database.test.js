// Una base con la estructura y los datos del sistema anterior, igual a la que
// creó sequelize.sync() en Railway: las migraciones deben convertirla.
const bd = require("../helpers/db");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawn } = require("node:child_process");
const migrar = require("../../database/migrate");
const { sequelize } = require("../../models");

const RAIZ = path.join(__dirname, "../..");

const ESQUEMA_ANTIGUO = `
  CREATE TABLE usuarios (
    id int NOT NULL AUTO_INCREMENT, nombre varchar(100) NOT NULL,
    email varchar(150) NOT NULL, password varchar(255) NOT NULL,
    rol enum('admin','usuario') NOT NULL DEFAULT 'usuario',
    PRIMARY KEY (id), UNIQUE KEY email (email)) ENGINE=InnoDB;
  CREATE TABLE libros (
    id int NOT NULL AUTO_INCREMENT, titulo varchar(200) NOT NULL,
    autor varchar(150) NOT NULL, categoria varchar(100) NOT NULL DEFAULT 'General',
    cantidad int NOT NULL DEFAULT '0', PRIMARY KEY (id)) ENGINE=InnoDB;
  CREATE TABLE prestamos (
    id int NOT NULL AUTO_INCREMENT, usuario_id int NOT NULL, libro_id int NOT NULL,
    codigo varchar(8) NOT NULL, fecha_prestamo date DEFAULT NULL,
    fecha_devolucion date DEFAULT NULL,
    estado enum('pendiente','prestado','devuelto') NOT NULL DEFAULT 'pendiente',
    PRIMARY KEY (id), UNIQUE KEY codigo (codigo),
    CONSTRAINT prestamos_ibfk_1 FOREIGN KEY (usuario_id) REFERENCES usuarios (id)
      ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT prestamos_ibfk_2 FOREIGN KEY (libro_id) REFERENCES libros (id)
      ON DELETE CASCADE ON UPDATE CASCADE) ENGINE=InnoDB;

  -- Antes "cantidad" eran los disponibles: el libro 1 tiene 3 ejemplares,
  -- 1 prestado, y guardaba 2.
  INSERT INTO usuarios (id, nombre, email, password) VALUES (1, 'Lector', 'l@x.com', 'x');
  INSERT INTO libros (id, titulo, autor, cantidad) VALUES (1, 'Con préstamo', 'A', 2), (2, 'Sin préstamo', 'B', 4);
  INSERT INTO prestamos (usuario_id, libro_id, codigo, estado, fecha_prestamo)
    VALUES (1, 1, 'AAAA0001', 'prestado', '2026-01-01'),
           (1, 2, 'AAAA0002', 'devuelto', NULL);`;

const ejecutarMigrar = () =>
  new Promise((resolve) => {
    const proceso = spawn(process.execPath, ["scripts/migrate.js"], {
      cwd: RAIZ,
      env: process.env,
    });
    let salida = "";
    proceso.stdout.on("data", (d) => (salida += d));
    proceso.stderr.on("data", (d) => (salida += d));
    proceso.on("exit", (codigo) => resolve({ codigo, salida }));
  });

before(async () => {
  await bd.crearBaseDePrueba({ preparar: false });
  const cx = await bd.conectar();
  await cx.query(`USE \`${bd.NOMBRE_BD}\`; ${ESQUEMA_ANTIGUO}`);
  await cx.end();
});
after(() => bd.borrarBaseDePrueba());

describe("migrar una base antigua", () => {
  it("dos procesos a la vez la migran una sola vez y sin errores", async () => {
    const [a, b] = await Promise.all([ejecutarMigrar(), ejecutarMigrar()]);
    assert.equal(a.codigo, 0, a.salida);
    assert.equal(b.codigo, 0, b.salida);

    const libros = await bd.consultar(
      "SELECT id, cantidad FROM libros ORDER BY id",
    );
    assert.deepEqual(libros, [
      { id: 1, cantidad: 3 },
      { id: 2, cantidad: 4 },
    ]);
  });

  it("agrega la versión de sesión a los usuarios", async () => {
    const [usuario] = await bd.consultar("SELECT version_token FROM usuarios");
    assert.equal(usuario.version_token, 0);
  });

  it("agrega fecha límite, rechazo y cancelación a los préstamos", async () => {
    const [estado] = await bd.consultar(
      `SELECT COLUMN_TYPE AS tipo FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prestamos'
          AND COLUMN_NAME = 'estado'`,
    );
    assert.match(estado.tipo, /'rechazado','cancelado'/);

    // La fecha límite de los préstamos existentes sale de su fecha de préstamo.
    const prestamos = await bd.consultar(
      "SELECT codigo, fecha_limite, motivo_rechazo FROM prestamos ORDER BY codigo",
    );
    assert.deepEqual(prestamos, [
      { codigo: "AAAA0001", fecha_limite: "2026-01-15", motivo_rechazo: null },
      { codigo: "AAAA0002", fecha_limite: null, motivo_rechazo: null },
    ]);

    const indices = await bd.consultar(
      `SELECT DISTINCT INDEX_NAME AS nombre FROM information_schema.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'prestamos'`,
    );
    assert.ok(indices.some((i) => i.nombre === "idx_prestamos_estado_limite"));
  });

  it("agrega datos bibliográficos, marcas de tiempo y la tabla de auditoría", async () => {
    const columnas = await bd.consultar(
      `SELECT TABLE_NAME AS tabla, COLUMN_NAME AS columna
         FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND COLUMN_NAME IN ('isbn', 'editorial', 'anio', 'creado_en', 'actualizado_en')`,
    );
    const de = (tabla) =>
      columnas
        .filter((c) => c.tabla === tabla)
        .map((c) => c.columna)
        .sort();
    assert.deepEqual(de("libros"), [
      "actualizado_en",
      "anio",
      "creado_en",
      "editorial",
      "isbn",
    ]);
    assert.deepEqual(de("usuarios"), ["actualizado_en", "creado_en"]);
    assert.deepEqual(de("prestamos"), ["actualizado_en", "creado_en"]);

    // Las filas que ya existían reciben la fecha de la migración.
    const [libro] = await bd.consultar(
      "SELECT creado_en FROM libros WHERE id = 1",
    );
    assert.ok(libro.creado_en);

    const [auditoria] = await bd.consultar(
      `SELECT COUNT(*) AS n FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'auditoria'`,
    );
    assert.equal(Number(auditoria.n), 1);
  });

  it("reemplaza el borrado en cascada y protege el historial", async () => {
    const reglas = await bd.consultar(
      `SELECT DELETE_RULE AS regla FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'prestamos'`,
    );
    assert.deepEqual(
      reglas.map((r) => r.regla),
      ["RESTRICT", "RESTRICT"],
    );

    await assert.rejects(
      bd.consultar("DELETE FROM usuarios WHERE id = 1"),
      (error) => error.parent?.code === "ER_ROW_IS_REFERENCED_2",
    );
    const [{ prestamos }] = await bd.consultar(
      "SELECT COUNT(*) AS prestamos FROM prestamos",
    );
    assert.equal(Number(prestamos), 2);
  });

  it("repetir una migración de estructura no duplica restricciones", async () => {
    await bd.consultar(
      "DELETE FROM migraciones WHERE nombre = '003-protect-loan-history.js'",
    );
    assert.deepEqual(await migrar(sequelize), ["003-protect-loan-history.js"]);

    const claves = await bd.consultar(
      `SELECT CONSTRAINT_TYPE AS tipo FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('prestamos', 'libros')
          AND CONSTRAINT_TYPE IN ('FOREIGN KEY', 'CHECK')`,
    );
    assert.equal(claves.filter((c) => c.tipo === "FOREIGN KEY").length, 2);
    assert.equal(claves.filter((c) => c.tipo === "CHECK").length, 1);
  });

  it("sin migraciones pendientes no hace nada", async () => {
    assert.deepEqual(await migrar(sequelize), []);
  });

  it("reconoce los nombres anteriores de los archivos y no las repite", async () => {
    // Así quedó registrado en Railway antes de renombrar los archivos a inglés.
    // La 004 y la 005 no estaban registradas: se aplican de nuevo y no deben
    // cambiar nada.
    await bd.consultar("DELETE FROM migraciones");
    await bd.consultar(
      `INSERT INTO migraciones (nombre) VALUES
        ('001-cantidad-es-total.js'), ('002-version-token.js'), ('003-proteger-historial.js')`,
    );

    assert.deepEqual(await migrar(sequelize), [
      "004-loan-due-dates-and-states.js",
      "005-audit-and-book-details.js",
    ]);

    const registradas = await bd.consultar(
      "SELECT nombre FROM migraciones ORDER BY nombre",
    );
    assert.deepEqual(
      registradas.map((m) => m.nombre),
      [
        "001-quantity-is-total.js",
        "002-token-version.js",
        "003-protect-loan-history.js",
        "004-loan-due-dates-and-states.js",
        "005-audit-and-book-details.js",
      ],
    );
    const [prestamo] = await bd.consultar(
      "SELECT fecha_limite FROM prestamos WHERE codigo = 'AAAA0001'",
    );
    assert.equal(prestamo.fecha_limite, "2026-01-15");
    const [libro] = await bd.consultar(
      "SELECT cantidad FROM libros WHERE id = 1",
    );
    assert.equal(
      libro.cantidad,
      3,
      "la 001 no debe sumar de nuevo los préstamos",
    );
  });
});
