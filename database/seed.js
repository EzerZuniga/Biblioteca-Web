// Datos iniciales (los mismos de database/biblioteca.sql).
// Solo se insertan si la tabla está vacía, así nunca se duplican ni se borran datos.
const { Usuario, Libro } = require("../models");

const usuarios = [
  {
    nombre: "Administrador",
    email: "admin@biblioteca.com",
    password: "$2b$10$l4w0llj4wahBQvlW4NK6WO/LIavEx0.RSgSg6sMkeVpNu.kDmVkJW",
    rol: "admin",
  },
  {
    nombre: "Usuario de prueba",
    email: "usuario@biblioteca.com",
    password: "$2b$10$lYcQAD.IZsmqGONX1eW9lOnsYG9/PWYs0v3itJd.Q03sLfmeq7mye",
    rol: "usuario",
  },
];

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

async function seed() {
  if ((await Usuario.count()) === 0) {
    await Usuario.bulkCreate(usuarios);
    console.log("Usuarios iniciales creados");
  }
  if ((await Libro.count()) === 0) {
    await Libro.bulkCreate(libros);
    console.log("Libros iniciales creados");
  }
}

module.exports = seed;
