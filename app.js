const path = require("path");
const express = require("express");
const { cabeceras } = require("./middlewares/security");
const registrarPeticiones = require("./middlewares/requestLogger");
const { rutaNoEncontrada, manejarErrores } = require("./middlewares/errors");

// Solo arma la aplicación de Express, sin abrir puertos ni tocar la base.
// server.js la pone a escuchar y los tests la usan directamente con Supertest.
const app = express();

// Railway pone un proxy delante de la app. Confiar en un salto permite leer la
// IP real del visitante, que es la que usan los límites de intentos.
app.set("trust proxy", 1);

app.use(registrarPeticiones);
// El healthcheck va antes de los límites de intentos: Railway lo consulta seguido.
app.use(require("./routes/healthRoutes"));

// El frontend se sirve desde este mismo dominio, así que no se habilita CORS:
// otros sitios no pueden llamar a la API desde el navegador.
app.use(cabeceras);
app.use(express.json({ limit: "20kb" }));

app.use(require("./routes/legacyRedirects").router);
app.use(express.static(path.join(__dirname, "public")));

app.use("/api/v1", require("./routes/apiV1"));

app.use(rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;

// Antes este archivo arrancaba el servidor. Si algo todavía ejecuta
// "node app.js" (por ejemplo, un comando de inicio configurado en Railway),
// sigue funcionando.
if (require.main === module) require("./server");
