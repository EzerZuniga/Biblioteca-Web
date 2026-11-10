let prestamos = [];
let paginaActual = 1;

if (protegerPagina("admin")) {
  renderNavbar();
  cargar();
}

// El filtro se aplica en el servidor: con paginación, el navegador no tiene
// todos los préstamos. Las cifras del encabezado salen del resumen.
async function cargar(pagina = paginaActual) {
  try {
    const [listado, resumen] = await Promise.all([
      api(conConsulta("/prestamos", { estado: $("filtro").value, pagina })),
      api("/prestamos/resumen"),
    ]);
    const { datos, paginacion } = listado;
    // Si la página quedó vacía (por ejemplo, tras aprobar), se vuelve atrás.
    if (!datos.length && paginacion.pagina > 1) {
      return cargar(paginacion.pagina - 1);
    }
    prestamos = datos;
    paginaActual = paginacion.pagina;
    pintarResumen(resumen);
    pintar();
    pintarPaginacion($("paginacion"), paginacion, cargar);
  } catch (error) {
    toast(error.message, "error");
  }
}

const plural = (cantidad, singular, varios) =>
  `${cantidad} ${cantidad === 1 ? singular : varios}`;

function pintarResumen({ pendientes, vencidos }) {
  const partes = [
    pendientes
      ? `${plural(pendientes, "solicitud espera", "solicitudes esperan")} tu aprobación`
      : "No hay solicitudes pendientes",
  ];
  if (vencidos) {
    partes.push(plural(vencidos, "préstamo vencido", "préstamos vencidos"));
  }
  $("resumen").textContent = partes.join(" · ");
}

function acciones(p) {
  if (p.estado === "pendiente") {
    return `
      <button class="btn btn-chico" data-accion="aprobar" data-id="${p.id}">Aprobar</button>
      <button class="btn btn-peligro btn-chico" data-accion="rechazar" data-id="${p.id}">Rechazar</button>`;
  }
  if (p.estado === "prestado") {
    return `<button class="btn btn-secundario btn-chico" data-accion="devolver" data-id="${p.id}">Registrar devolución</button>`;
  }
  return "";
}

function pintar() {
  if (!prestamos.length) {
    $("cuerpo").innerHTML =
      `<tr><td colspan="6"><div class="vacio"><strong>No hay préstamos para mostrar</strong>Cuando un usuario solicite un libro, aparecerá aquí.</div></td></tr>`;
    return;
  }

  $("cuerpo").innerHTML = prestamos
    .map(
      (p) => `
      <tr>
        <td data-label="Código"><span class="codigo">${esc(p.codigo)}</span></td>
        <td data-label="Libro"><span class="celda-principal">${esc(p.Libro?.titulo)}</span></td>
        <td data-label="Lector">${esc(p.Usuario?.nombre)}<span class="celda-secundaria">${esc(p.Usuario?.email)}</span></td>
        <td data-label="Estado">${badgeEstado(p.estado, p.vencido)}${detalleEstado(p)}</td>
        ${celdaFechas(p)}
        ${acciones(p) ? celdaAcciones(acciones(p)) : '<td data-label="Acciones" class="sin-dato"><span class="suave">—</span></td>'}
      </tr>`,
    )
    .join("");
}

$("filtro").addEventListener("change", () => cargar(1));

$("cuerpo").addEventListener("click", async (e) => {
  const boton = e.target.closest("button[data-accion]");
  if (!boton) return;
  const { accion, id } = boton.dataset;

  let cuerpo = null;
  if (accion === "rechazar") {
    const motivo = prompt("Motivo del rechazo (opcional, lo verá el lector):");
    if (motivo === null) return;
    cuerpo = { motivo };
  }

  boton.disabled = true;
  try {
    const res = await api(`/prestamos/${id}/${accion}`, "PUT", cuerpo);
    toast(res.mensaje);
  } catch (error) {
    toast(error.message, "error");
  }
  cargar();
});
