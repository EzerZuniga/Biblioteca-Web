if (protegerPagina("usuario")) {
  renderNavbar();
  cargar();
}

async function cargar() {
  try {
    const prestamos = await api("/prestamos");
    if (!prestamos.length) {
      $("contenido").innerHTML =
        `<div class="vacio"><strong>Todavía no has pedido libros</strong>Busca uno en el <a href="/catalogo.html">catálogo</a> y solicita tu primer préstamo.</div>`;
      return;
    }
    $("contenido").innerHTML = `
      <div class="tabla-wrap"><table>
        <thead><tr><th>Código</th><th>Libro</th><th>Estado</th><th>Fecha de préstamo</th><th>Fecha de devolución</th></tr></thead>
        <tbody>${prestamos
          .map(
            (p) => `
          <tr>
              <td data-label="Código"><span class="codigo">${esc(p.codigo)}</span></td>
              <td data-label="Libro"><strong>${esc(p.Libro?.titulo)}</strong><br><span class="suave">${esc(p.Libro?.autor)}</span></td>
              <td data-label="Estado">${badgeEstado(p.estado)}</td>
              <td data-label="Fecha de préstamo">${formatearFecha(p.fecha_prestamo)}</td>
              <td data-label="Fecha de devolución">${formatearFecha(p.fecha_devolucion)}</td>
          </tr>`,
          )
          .join("")}
        </tbody>
      </table></div>`;
  } catch (error) {
    toast(error.message, "error");
  }
}
