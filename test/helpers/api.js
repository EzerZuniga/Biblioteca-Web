const request = require("supertest");
const app = require("../../app");

// Cada petición sale de una IP distinta para que los límites de intentos no
// interfieran entre tests. Los tests de seguridad fijan la IP a propósito.
let contador = 0;
const ipNueva = () => {
  contador += 1;
  return `10.${(contador >> 16) & 255}.${(contador >> 8) & 255}.${contador & 255}`;
};

const peticion = (metodo, ruta, { token, cuerpo, ip = ipNueva() } = {}) => {
  let req = request(app)[metodo](ruta).set("X-Forwarded-For", ip);
  if (token) req = req.set("Authorization", `Bearer ${token}`);
  if (cuerpo !== undefined) req = req.send(cuerpo);
  return req;
};

module.exports = {
  app,
  get: (ruta, opciones) => peticion("get", ruta, opciones),
  post: (ruta, opciones) => peticion("post", ruta, opciones),
  put: (ruta, opciones) => peticion("put", ruta, opciones),
  delete: (ruta, opciones) => peticion("delete", ruta, opciones),
};
