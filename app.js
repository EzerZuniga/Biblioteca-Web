const path = require("path");
const express = require("express");
const { cabeceras, limiteApi } = require("./middlewares/seguridad");
const { rutaNoEncontrada, manejarErrores } = require("./middlewares/errores");

// Solo arma la aplicación de Express, sin abrir puertos ni tocar la base.
// app.js la pone a escuchar y los tests la usan directamente con Supertest.
const app = express();

// Railway pone un proxy delante de la app. Confiar en un salto permite leer la
// IP real del visitante, que es la que usan los límites de intentos.
app.set("trust proxy", 1);

// El frontend se sirve desde este mismo dominio, así que no se habilita CORS:
// otros sitios no pueden llamar a la API desde el navegador.
app.use(cabeceras);
app.use(express.json({ limit: "20kb" }));

app.use(express.static(path.join(__dirname, "public")));

app.use(["/auth", "/usuarios", "/libros", "/prestamos"], limiteApi);
app.use("/auth", require("./routes/authRoutes"));
app.use("/usuarios", require("./routes/usuarioRoutes"));
app.use("/libros", require("./routes/libroRoutes"));
app.use("/prestamos", require("./routes/prestamoRoutes"));

app.use(rutaNoEncontrada);
app.use(manejarErrores);

module.exports = app;
