let prestamos = [];

if (protegerPagina("admin")) {
  renderNavbar();
  cargar();
}

async function cargar() {
  try {
    prestamos = await api("/prestamos");
    pintar();
  } catch (error) {
    toast(error.message, "error");
  }
}

function pintar() {
  const pendientes = prestamos.filter((p) => p.estado === "pendiente").length;
  $("resumen").textContent = pendientes
    ? `${pendientes} ${pendientes === 1 ? "solicitud espera" : "solicitudes esperan"} tu aprobación`
    : "No hay solicitudes pendientes";

  const filtro = $("filtro").value;
  const lista = filtro
    ? prestamos.filter((p) => p.estado === filtro)
    : prestamos;

  if (!lista.length) {
    $("cuerpo").innerHTML =
      `<tr><td colspan="7"><div class="vacio"><strong>No hay préstamos para mostrar</strong>Cuando un usuario solicite un libro, aparecerá aquí.</div></td></tr>`;
    return;
  }

  $("cuerpo").innerHTML = lista
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

$("filtro").addEventListener("change", pintar);

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
