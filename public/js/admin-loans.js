let prestamos = [];
let paginaActual = 1;

if (protegerPagina("admin")) {
  renderNavbar();
  cargar();
}

// El filtro se aplica en el servidor: con paginación, el navegador no tiene
// todos los préstamos. El total de pendientes sale de una consulta aparte.
async function cargar(pagina = paginaActual) {
  try {
    const [listado, pendientes] = await Promise.all([
      api(conConsulta("/prestamos", { estado: $("filtro").value, pagina })),
      api(conConsulta("/prestamos", { estado: "pendiente", porPagina: 1 })),
    ]);
    const { datos, paginacion } = listado;
    // Si la página quedó vacía (por ejemplo, tras aprobar), se vuelve atrás.
    if (!datos.length && paginacion.pagina > 1) {
      return cargar(paginacion.pagina - 1);
    }
    prestamos = datos;
    paginaActual = paginacion.pagina;
    pintarResumen(pendientes.paginacion.total);
    pintar();
    pintarPaginacion($("paginacion"), paginacion, cargar);
  } catch (error) {
    toast(error.message, "error");
  }
}

function pintarResumen(pendientes) {
  $("resumen").textContent = pendientes
    ? `${pendientes} ${pendientes === 1 ? "solicitud espera" : "solicitudes esperan"} tu aprobación`
    : "No hay solicitudes pendientes";
}

function pintar() {
  if (!prestamos.length) {
    $("cuerpo").innerHTML =
      `<tr><td colspan="7"><div class="vacio"><strong>No hay préstamos para mostrar</strong>Cuando un usuario solicite un libro, aparecerá aquí.</div></td></tr>`;
    return;
  }

  $("cuerpo").innerHTML = prestamos
    .map((p) => {
      let accion = '<span class="suave">—</span>';
      if (p.estado === "pendiente") {
        accion = `<button class="btn btn-chico" data-accion="aprobar" data-id="${p.id}">Aprobar</button>`;
      } else if (p.estado === "prestado") {
        accion = `<button class="btn btn-secundario btn-chico" data-accion="devolver" data-id="${p.id}">Registrar devolución</button>`;
      }
      return `
      <tr>
        <td data-label="Código"><span class="codigo">${esc(p.codigo)}</span></td>
        <td data-label="Usuario">${esc(p.Usuario?.nombre)}<br><span class="suave">${esc(p.Usuario?.email)}</span></td>
        <td data-label="Libro">${esc(p.Libro?.titulo)}</td>
        <td data-label="Estado">${badgeEstado(p.estado)}</td>
        <td data-label="Préstamo">${formatearFecha(p.fecha_prestamo)}</td>
        <td data-label="Devolución">${formatearFecha(p.fecha_devolucion)}</td>
        <td data-label="Acción">${accion}</td>
      </tr>`;
    })
    .join("");
}

$("filtro").addEventListener("change", () => cargar(1));

$("cuerpo").addEventListener("click", async (e) => {
  const boton = e.target.closest("button[data-accion]");
  if (!boton) return;
  boton.disabled = true;
  try {
    const res = await api(
      `/prestamos/${boton.dataset.id}/${boton.dataset.accion}`,
      "PUT",
    );
    toast(res.mensaje);
  } catch (error) {
    toast(error.message, "error");
  }
  cargar();
});
