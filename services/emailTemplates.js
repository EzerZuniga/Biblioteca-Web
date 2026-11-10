const escapar = (texto) =>
  String(texto).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );

// Correo para restablecer la contraseña: versión HTML y versión de texto
// (algunos clientes y filtros de spam prefieren la de texto).
const correoDeRecuperacion = ({ nombre, enlace, minutos }) => ({
  asunto: "Restablece tu contraseña de la Biblioteca",
  texto: [
    `Hola, ${nombre}:`,
    "",
    "Pediste restablecer la contraseña de tu cuenta en la Biblioteca.",
    `Abre este enlace para elegir una nueva (vence en ${minutos} minutos y sirve una sola vez):`,
    "",
    enlace,
    "",
    "Si no lo pediste, ignora este correo: tu contraseña no cambia.",
  ].join("\n"),
  html: `
    <div style="font-family: Arial, sans-serif; max-width: 520px; color: #17263b">
      <p>Hola, ${escapar(nombre)}:</p>
      <p>Pediste restablecer la contraseña de tu cuenta en la Biblioteca.</p>
      <p>
        <a href="${escapar(enlace)}"
           style="display: inline-block; background: #24508a; color: #ffffff;
                  padding: 10px 18px; border-radius: 6px; text-decoration: none">
          Elegir una contraseña nueva
        </a>
      </p>
      <p style="color: #55616f; font-size: 14px">
        El enlace vence en ${minutos} minutos y sirve una sola vez.
        Si no lo pediste, ignora este correo: tu contraseña no cambia.
      </p>
    </div>`,
});

module.exports = { correoDeRecuperacion };
