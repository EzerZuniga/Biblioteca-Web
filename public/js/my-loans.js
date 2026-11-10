let paginaActual = 1;

if (protegerPagina("usuario")) {
  renderNavbar();
  cargar(1);
}

const accion = (p) =>
  p.estado === "pendiente"
    ? celdaAcciones(
        `<button class="btn btn-secundario btn-chico" data-cancelar="${p.id}">Cancelar solicitud</button>`,
      )
    : '<td data-label="Acciones" class="sin-dato"><span class="suave">—</span></td>';

async function cargar(pagina = paginaActual) {
  try {
    const { datos: prestamos, paginacion } = await api(
      conConsulta("/prestamos", { pagina }),
    );
    if (!prestamos.length && paginacion.pagina > 1) {
      return cargar(paginacion.pagina - 1);
    }
    paginaActual = paginacion.pagina;
    pintarPaginacion($("paginacion"), paginacion, cargar);
    if (!prestamos.length) {
      $("contenido").innerHTML =
        `<div class="vacio"><strong>Todavía no has pedido libros</strong>Busca uno en el <a href="/catalog.html">catálogo</a> y solicita tu primer préstamo.</div>`;
      return;
    }

    const vencidos = prestamos.filter((p) => p.vencido).length;
    const aviso = vencidos
      ? `<p class="error" role="alert">${
          vencidos === 1
            ? "Tienes un préstamo vencido. Devuélvelo"
            : `Tienes ${vencidos} préstamos vencidos. Devuélvelos`
        } para poder pedir otros libros.</p>`
      : "";

    $("contenido").innerHTML = `${aviso}
      <div class="tabla-wrap"><table>
        <thead><tr><th>Código</th><th>Libro</th><th>Estado</th><th>Fechas</th><th>Acciones</th></tr></thead>
        <tbody>${prestamos
          .map(
            (p) => `
          <tr>
              <td data-label="Código"><span class="codigo">${esc(p.codigo)}</span></td>
              <td data-label="Libro"><span class="celda-principal">${esc(p.Libro?.titulo)}</span><span class="celda-secundaria">${esc(p.Libro?.autor)}</span></td>
              <td data-label="Estado">${badgeEstado(p.estado, p.vencido)}${detalleEstado(p)}</td>
              ${celdaFechas(p)}
              ${accion(p)}
          </tr>`,
          )
          .join("")}
        </tbody>
      </table></div>`;
  } catch (error) {
    toast(error.message, "error");
  }
}

$("contenido").addEventListener("click", async (e) => {
  const boton = e.target.closest("button[data-cancelar]");
  if (!boton || !confirm("¿Cancelar esta solicitud?")) return;
  boton.disabled = true;
  try {
    const res = await api(
      `/prestamos/${boton.dataset.cancelar}/cancelar`,
      "PUT",
    );
    toast(res.mensaje);
  } catch (error) {
    toast(error.message, "error");
  }
  cargar();
});
