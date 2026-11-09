// Datos iniciales. Solo se insertan si hacen falta, así nunca se duplican ni
// se borran datos. No hay cuentas con contraseña fija: el administrador sale
// de las variables ADMIN_EMAIL y ADMIN_PASSWORD, o del comando crear-admin.
const bcrypt = require("bcrypt");
const { Usuario, Libro } = require("../models");
const { emailValido, contrasenaSegura } = require("../utils/validar");

// En libros, "cantidad" es el total de ejemplares.
const libros = [
  { titulo: "Cien años de soledad", autor: "Gabriel García Márquez", categoria: "Novela", cantidad: 5 },
  { titulo: "Los ríos profundos", autor: "José María Arguedas", categoria: "Novela", cantidad: 3 },
  { titulo: "Conversación en La Catedral", autor: "Mario Vargas Llosa", categoria: "Novela", cantidad: 2 },
  { titulo: "Don Quijote de la Mancha", autor: "Miguel de Cervantes", categoria: "Clásicos", cantidad: 4 },
  { titulo: "Clean Code", autor: "Robert C. Martin", categoria: "Programación", cantidad: 3 },
  { titulo: "JavaScript: The Good Parts", autor: "Douglas Crockford", categoria: "Programación", cantidad: 2 },
  { titulo: "Fundamentos de bases de datos", autor: "Abraham Silberschatz", categoria: "Bases de datos", cantidad: 4 },
  { titulo: "Breve historia del tiempo", autor: "Stephen Hawking", categoria: "Ciencia", cantidad: 0 },
];

async function crearAdminInicial() {
  if ((await Usuario.count({ where: { rol: "admin" } })) > 0) return;

  const email = String(process.env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = String(process.env.ADMIN_PASSWORD || "");
  if (!email || !password) {
    console.warn(
      "No hay administrador. Define ADMIN_EMAIL y ADMIN_PASSWORD, o ejecuta npm run crear-admin.",
    );
    return;
  }
  if (!emailValido(email) || !contrasenaSegura(password)) {
    console.warn(
      "No se creó el administrador: ADMIN_EMAIL no es válido o ADMIN_PASSWORD es débil.",
    );
    return;
  }

  await Usuario.create({
    nombre: String(process.env.ADMIN_NOMBRE || "Administrador").trim(),
    email,
    password: await bcrypt.hash(password, 10),
    rol: "admin",
  });
  console.log(`Administrador inicial creado: ${email}`);
}

async function seed() {
  if ((await Libro.count()) === 0) {
    await Libro.bulkCreate(libros);
    console.log("Libros iniciales creados");
  }
  await crearAdminInicial();
}

module.exports = seed;
