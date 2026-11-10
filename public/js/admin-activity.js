let paginaActual = 1;

if (protegerPagina("admin")) {
  renderNavbar();
  cargar();
}

const NOMBRES_DE_CAMPO = {
  titulo: "título",
  autor: "autor",
  categoria: "categoría",
  isbn: "ISBN",
  editorial: "editorial",
  anio: "año",
  cantidad: "ejemplares",
  nombre: "nombre",
  email: "email",
  rol: "rol",
  password: "contraseña",
};

const listaDeCampos = (cambios = {}) =>
  Object.keys(cambios)
    .map((campo) => NOMBRES_DE_CAMPO[campo] || campo)
    .join(", ");

// Texto legible de cada acción. Los datos vienen guardados en el registro, así
// la descripción se entiende aunque el libro o el usuario ya no existan.
const DESCRIPCIONES = {
  "prestamo.solicitado": (d) => `Solicitó «${d.libro}» (código ${d.codigo})`,
  "prestamo.aprobado": (d) =>
    `Aprobó el préstamo ${d.codigo} de «${d.libro}», vence el ${formatearFecha(d.fechaLimite)}`,
  "prestamo.rechazado": (d) =>
    `Rechazó la solicitud ${d.codigo} de «${d.libro}»${d.motivo ? `: ${d.motivo}` : ""}`,
  "prestamo.cancelado": (d) =>
    `Canceló su solicitud ${d.codigo} de «${d.libro}»`,
  "prestamo.devuelto": (d) =>
    `Registró la devolución ${d.codigo} de «${d.libro}»${d.diasDeRetraso ? `, con ${d.diasDeRetraso} días de retraso` : ""}`,
  "libro.creado": (d) => `Agregó el libro «${d.titulo}»`,
  "libro.actualizado": (d) =>
    `Editó «${d.titulo}»: ${listaDeCampos(d.cambios)}`,
  "libro.eliminado": (d) => `Eliminó el libro «${d.titulo}»`,
  "usuario.registrado": (d) => `Creó su cuenta (${d.email})`,
  "usuario.actualizado": (d) =>
    `Editó al usuario ${d.email}: ${listaDeCampos(d.cambios)}`,
  "usuario.eliminado": (d) => `Eliminó al usuario ${d.nombre} (${d.email})`,
  "usuario.admin_guardado": (d) =>
    `Se ${d.resultado === "creado" ? "creó" : "actualizó"} el administrador ${d.email} desde la consola`,
  "usuario.recuperacion_solicitada": (d) =>
    `Se pidió un enlace para restablecer la contraseña de ${d.email}`,
  "usuario.contrasena_restablecida": (d) =>
    `Restableció su contraseña con un enlace (${d.email})`,
};

// Acciones que nadie con sesión hizo: el autor no es una cuenta eliminada.
const AUTOR_SIN_CUENTA = {
  "usuario.admin_guardado": "Sistema",
  "usuario.recuperacion_solicitada": "Sin iniciar sesión",
};

const describir = (registro) =>
  (DESCRIPCIONES[registro.accion] || (() => registro.accion))(
    registro.detalles || {},
  );

const FORMATO_FECHA = new Intl.DateTimeFormat("es-PE", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Lima",
});

const quien = (registro) =>
  registro.actor
    ? `${esc(registro.actor.nombre)}<br><span class="suave">${esc(registro.actor.email)}</span>`
    : `<span class="suave">${esc(AUTOR_SIN_CUENTA[registro.accion] || "Cuenta eliminada")}</span>`;

async function cargar(pagina = paginaActual) {
  try {
    const { datos, paginacion } = await api(
      conConsulta("/auditoria", { entidad: $("filtro").value, pagina }),
    );
    paginaActual = paginacion.pagina;
    pintarPaginacion($("paginacion"), paginacion, cargar);

    $("cuerpo").innerHTML = datos.length
      ? datos
          .map(
            (r) => `
        <tr>
          <td data-label="Fecha">${esc(FORMATO_FECHA.format(new Date(r.creado_en)))}</td>
          <td data-label="Quién">${quien(r)}</td>
          <td data-label="Qué hizo">${esc(describir(r))}</td>
        </tr>`,
          )
          .join("")
      : `<tr><td colspan="3"><div class="vacio"><strong>Todavía no hay actividad</strong>Aquí aparecerá cada cambio en préstamos, libros y usuarios.</div></td></tr>`;
  } catch (error) {
    toast(error.message, "error");
  }
}

$("filtro").addEventListener("change", () => cargar(1));
