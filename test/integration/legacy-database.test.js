// Una base con la estructura y los datos del sistema anterior, igual a la que
// creó sequelize.sync() en Railway: las migraciones deben convertirla.
const bd = require("../ayudantes/bd");
const { describe, it, before, after } = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawn } = require("node:child_process");
const migrar = require("../../database/migrar");
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
  INSERT INTO prestamos (usuario_id, libro_id, codigo, estado)
    VALUES (1, 1, 'AAAA0001', 'prestado'), (1, 2, 'AAAA0002', 'devuelto');`;

const ejecutarMigrar = () =>
  new Promise((resolve) => {
    const proceso = spawn(process.execPath, ["scripts/migrar.js"], {
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

    const libros = await bd.consultar("SELECT id, cantidad FROM libros ORDER BY id");
    assert.deepEqual(libros, [
      { id: 1, cantidad: 3 },
      { id: 2, cantidad: 4 },
    ]);
  });

  it("agrega la versión de sesión a los usuarios", async () => {
    const [usuario] = await bd.consultar("SELECT version_token FROM usuarios");
    assert.equal(usuario.version_token, 0);
  });

  it("reemplaza el borrado en cascada y protege el historial", async () => {
    const reglas = await bd.consultar(
      `SELECT DELETE_RULE AS regla FROM information_schema.REFERENTIAL_CONSTRAINTS
        WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'prestamos'`,
    );
    assert.deepEqual(reglas.map((r) => r.regla), ["RESTRICT", "RESTRICT"]);

    await assert.rejects(
      bd.consultar("DELETE FROM usuarios WHERE id = 1"),
      (error) => error.parent?.code === "ER_ROW_IS_REFERENCED_2",
    );
    const [{ prestamos }] = await bd.consultar("SELECT COUNT(*) AS prestamos FROM prestamos");
    assert.equal(Number(prestamos), 2);
  });

  it("repetir una migración de estructura no duplica restricciones", async () => {
    await bd.consultar("DELETE FROM migraciones WHERE nombre = '003-proteger-historial.js'");
    assert.deepEqual(await migrar(sequelize), ["003-proteger-historial.js"]);

    const claves = await bd.consultar(
      `SELECT CONSTRAINT_TYPE AS tipo FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE() AND CONSTRAINT_TYPE IN ('FOREIGN KEY', 'CHECK')`,
    );
    assert.equal(claves.filter((c) => c.tipo === "FOREIGN KEY").length, 2);
    assert.equal(claves.filter((c) => c.tipo === "CHECK").length, 1);
  });

  it("sin migraciones pendientes no hace nada", async () => {
    assert.deepEqual(await migrar(sequelize), []);
  });
});
