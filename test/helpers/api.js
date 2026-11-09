process.env.LOG_LEVEL ??= "silent";
const request = require("supertest");
const app = require("../../app");
const { CABECERA_FRONTEND } = require("../../middlewares/auth");
const { NOMBRE: COOKIE_SESION } = require("../../utils/sessionCookie");

// Cada petición sale de una IP distinta para que los límites de intentos no
// interfieran entre tests. Los tests de seguridad fijan la IP a propósito.
let contador = 0;
const ipNueva = () => {
  contador += 1;
  return `10.${(contador >> 16) & 255}.${(contador >> 8) & 255}.${contador & 255}`;
};

// token: sesión por cabecera Bearer. cookie: sesión como la del navegador.
// frontend: agrega la cabecera que envía el JavaScript de la página.
const peticion = (
  metodo,
  ruta,
  { token, cookie, frontend = false, cuerpo, ip = ipNueva() } = {},
) => {
  let req = request(app)[metodo](ruta).set("X-Forwarded-For", ip);
  if (token) req = req.set("Authorization", `Bearer ${token}`);
  if (cookie) req = req.set("Cookie", cookie);
  if (frontend) req = req.set("X-Requested-With", CABECERA_FRONTEND);
  if (cuerpo !== undefined) req = req.send(cuerpo);
  return req;
};

// Devuelve "sesion=..." de la respuesta del login, listo para reenviar.
const cookieDeSesion = (respuesta) =>
  (respuesta.headers["set-cookie"] ?? [])
    .map((cookie) => cookie.split(";")[0])
    .find((par) => par.startsWith(`${COOKIE_SESION}=`));

module.exports = {
  app,
  cookieDeSesion,
  get: (ruta, opciones) => peticion("get", ruta, opciones),
  post: (ruta, opciones) => peticion("post", ruta, opciones),
  put: (ruta, opciones) => peticion("put", ruta, opciones),
  delete: (ruta, opciones) => peticion("delete", ruta, opciones),
};
