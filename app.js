require("dotenv").config({ quiet: true });
const path = require("path");
const express = require("express");
const cors = require("cors");
const { sequelize } = require("./models");

if (!process.env.JWT_SECRET) {
  console.error("Falta JWT_SECRET en el archivo .env");
  process.exit(1);
}

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, "public")));

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
  console.error(err);
  res.status(500).json({ mensaje: "Error del servidor" });
});

const PORT = process.env.PORT || 3000;

sequelize
  .authenticate()
  .then(() => {
    console.log("Conectado a MySQL");
    app.listen(PORT, "0.0.0.0", () =>
      console.log(`Servidor listo en http://0.0.0.0:${PORT}`),
    );
  })
  .catch((error) => {
    console.error(
      "No se pudo conectar a MySQL. Revisa tu archivo .env y que MySQL esté encendido.",
    );
    console.error(error.message);
    process.exit(1);
  });
