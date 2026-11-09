// Crea datos de prueba directamente con los servicios, sin pasar por HTTP.
const auth = require("../../services/auth");
const usuarios = require("../../services/usuarios");
const libros = require("../../services/libros");

let secuencia = 0;
const siguiente = () => ++secuencia;

async function crearLector({ password = "secreto1", ...datos } = {}) {
  const n = siguiente();
  const email = datos.email ?? `lector${n}@prueba.com`;
  const usuario = await auth.registrar({
    nombre: datos.nombre ?? `Lector ${n}`,
    email,
    password,
  });
  const { token } = await auth.iniciarSesion({ email, password });
  return { ...usuario, password, token };
}

async function crearAdmin({ password = "ClaveAdmin123" } = {}) {
  const n = siguiente();
  const email = `admin${n}@prueba.com`;
  await usuarios.guardarAdmin(
    { nombre: `Admin ${n}`, email, password },
    { cambiarNombre: false },
  );
  const sesion = await auth.iniciarSesion({ email, password });
  return { ...sesion.usuario, email, password, token: sesion.token };
}

const crearLibro = (datos = {}) =>
  libros.crear({
    titulo: `Libro ${siguiente()}`,
    autor: "Autor de prueba",
    categoria: "General",
    cantidad: 1,
    ...datos,
  });

module.exports = { crearLector, crearAdmin, crearLibro };
