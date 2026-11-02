if (protegerPagina("usuario")) {
  renderNavbar();
  iniciar();
}

let temporizador;

function colorLomo(categoria) {
  let h = 0;
  for (const c of String(categoria || "")) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 38% 38%)`;
}

function pintar(libros, busqueda) {
  const grid = $("grid");
  if (!libros.length) {
    grid.innerHTML = busqueda
      ? `<div class="vacio" style="grid-column:1/-1"><strong>No hay libros con “${esc(busqueda)}”</strong>Prueba con otra palabra del título.</div>`
      : `<div class="vacio" style="grid-column:1/-1"><strong>El catálogo está vacío</strong>Cuando se agreguen libros, aparecerán aquí.</div>`;
    return;
  }
  grid.innerHTML = libros
    .map(
      (l) => `
    <article class="libro">
      <span class="lomo" style="--color-lomo:${colorLomo(l.categoria)}"></span>
      <div class="libro-cuerpo">
        <h3>${esc(l.titulo)}</h3>
        <p class="autor">${esc(l.autor)}</p>
        <p class="categoria">${esc(l.categoria)}</p>
        <p class="disp ${l.cantidad < 1 ? "agotado" : ""}">
          ${l.cantidad < 1 ? "Sin ejemplares" : `${l.cantidad} ${l.cantidad === 1 ? "disponible" : "disponibles"}`}
        </p>
        <button class="btn btn-chico" data-id="${l.id}" ${l.cantidad < 1 ? "disabled" : ""}>Solicitar préstamo</button>
      </div>
    </article>`,
    )
    .join("");
}

async function cargar() {
  const busqueda = $("buscar").value.trim();
  try {
    const libros = await api(
      "/libros" + (busqueda ? `?titulo=${encodeURIComponent(busqueda)}` : ""),
    );
    pintar(libros, busqueda);
  } catch (error) {
    toast(error.message, "error");
  }
}

function iniciar() {
  cargar();

  $("buscar").addEventListener("input", () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(cargar, 300);
  });

  $("grid").addEventListener("click", async (e) => {
    const boton = e.target.closest("button[data-id]");
    if (!boton) return;
    boton.disabled = true;
    try {
      const res = await api("/prestamos", "POST", {
        libro_id: Number(boton.dataset.id),
      });
      toast(res.mensaje);
    } catch (error) {
      toast(error.message, "error");
    }
    cargar();
  });
}
