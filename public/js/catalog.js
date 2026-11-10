let temporizador;
let paginaActual = 1;

if (protegerPagina("usuario")) {
  renderNavbar();
  iniciar();
}

function colorLomo(categoria) {
  let h = 0;
  for (const c of String(categoria || "")) h = (h * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${h} 38% 38%)`;
}

// "Editorial · Año", solo con los datos que el libro tenga.
const edicion = (libro) => {
  const partes = [libro.editorial, libro.anio].filter(Boolean).map(esc);
  return partes.length ? `<p class="suave">${partes.join(" · ")}</p>` : "";
};

function pintar(libros, busqueda) {
  const grid = $("grid");
  if (!libros.length) {
    grid.innerHTML = busqueda
      ? `<div class="vacio" style="grid-column:1/-1"><strong>No hay libros con “${esc(busqueda)}”</strong>Prueba con otra palabra del título, el autor o el ISBN.</div>`
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
        ${edicion(l)}
        <p class="disp ${l.disponibles < 1 ? "agotado" : ""}">
          ${l.disponibles < 1 ? "Sin ejemplares" : `${l.disponibles} ${l.disponibles === 1 ? "disponible" : "disponibles"}`}
        </p>
        <button class="btn btn-chico" data-id="${l.id}" ${l.disponibles < 1 ? "disabled" : ""}>Solicitar préstamo</button>
      </div>
    </article>`,
    )
    .join("");
}

async function cargar(pagina = paginaActual) {
  const busqueda = $("buscar").value.trim();
  try {
    const { datos, paginacion } = await api(
      conConsulta("/libros", { buscar: busqueda, pagina }),
    );
    paginaActual = paginacion.pagina;
    pintar(datos, busqueda);
    pintarPaginacion($("paginacion"), paginacion, cargar);
  } catch (error) {
    toast(error.message, "error");
  }
}

function iniciar() {
  cargar(1);

  // Una búsqueda nueva siempre empieza en la primera página.
  $("buscar").addEventListener("input", () => {
    clearTimeout(temporizador);
    temporizador = setTimeout(() => cargar(1), 300);
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
