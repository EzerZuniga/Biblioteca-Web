require("dotenv").config({ quiet: true });
const path = require("path");
const express = require("express");
const { sequelize } = require("./models");
const { cabeceras, limiteApi } = require("./middlewares/seguridad");

const faltantes = ["DB_NAME", "DB_USER", "JWT_SECRET"].filter(
  (nombre) => !process.env[nombre],
);
if (faltantes.length) {
  console.error(
    `Faltan variables de entorno: ${faltantes.join(", ")}. Revisa tu archivo .env`,
  );
  process.exit(1);
}

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

app.use((req, res) => {
  res.status(404).json({ mensaje: "Ruta no encontrada" });
});

app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res
      .status(400)
      .json({ mensaje: "El cuerpo de la petición no es un JSON válido" });
  }
  if (err.type === "entity.too.large") {
    return res
      .status(413)
      .json({ mensaje: "La petición es demasiado grande" });
  }
  console.error(err);
  res.status(500).json({ mensaje: "Error del servidor" });
});

const PORT = process.env.PORT || 3000;

sequelize
  .authenticate()
  .then(() => sequelize.sync()) // crea solo las tablas que falten; no modifica las existentes
  .then(() => require("./database/migrar")(sequelize)) // aplica migraciones pendientes
  .then((hechas) => hechas.forEach((m) => console.log(`Migración aplicada: ${m}`)))
  .then(() => require("./database/seed")()) // datos iniciales solo si las tablas están vacías
  .then(() => {
    console.log("Conectado a MySQL");
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`Servidor listo en http://0.0.0.0:${PORT}`),
    );
  })
  .catch((error) => {
    console.error(
      "No se pudo preparar la base de datos. Revisa tu archivo .env, que MySQL esté encendido y el error de abajo.",
    );
    console.error(error.message);
    process.exit(1);
  });
