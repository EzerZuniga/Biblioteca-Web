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
            <td><span class="codigo">${esc(p.codigo)}</span></td>
            <td><strong>${esc(p.Libro?.titulo)}</strong><br><span class="suave">${esc(p.Libro?.autor)}</span></td>
            <td>${badgeEstado(p.estado)}</td>
            <td>${formatearFecha(p.fecha_prestamo)}</td>
            <td>${formatearFecha(p.fecha_devolucion)}</td>
          </tr>`,
          )
          .join("")}
        </tbody>
      </table></div>`;
  } catch (error) {
    toast(error.message, "error");
  }
}
