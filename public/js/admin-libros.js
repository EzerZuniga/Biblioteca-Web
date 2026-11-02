let libros = [];

if (protegerPagina("admin")) {
  renderNavbar();
  cargar();
}

async function cargar() {
  try {
    libros = await api("/libros");
    pintar();
  } catch (error) {
    toast(error.message, "error");
  }
}

function pintar() {
  if (!libros.length) {
    $("cuerpo").innerHTML =
      `<tr><td colspan="5"><div class="vacio"><strong>No hay libros registrados</strong>Usa el formulario de arriba para crear el primero.</div></td></tr>`;
    return;
  }
  $("cuerpo").innerHTML = libros
    .map(
      (l) => `
    <tr>
      <td data-label="Título"><strong>${esc(l.titulo)}</strong></td>
      <td data-label="Autor">${esc(l.autor)}</td>
      <td data-label="Categoría">${esc(l.categoria)}</td>
      <td data-label="Cantidad">${l.cantidad}</td>
      <td data-label="Acciones" class="acciones-celda">
        <button class="btn btn-secundario btn-chico" data-accion="editar" data-id="${l.id}">Editar</button>
        <button class="btn btn-peligro btn-chico" data-accion="eliminar" data-id="${l.id}">Eliminar</button>
      </td>
    </tr>`,
    )
    .join("");
}

function limpiarFormulario() {
  $("formLibro").reset();
  $("libroId").value = "";
  $("cantidad").value = 1;
  $("tituloForm").textContent = "Nuevo libro";
  $("btnGuardar").textContent = "Crear libro";
  $("btnCancelar").hidden = true;
}

$("btnCancelar").addEventListener("click", limpiarFormulario);

$("formLibro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = $("libroId").value;
  const datos = {
    titulo: $("titulo").value,
    autor: $("autor").value,
    categoria: $("categoria").value,
    cantidad: $("cantidad").value,
  };
  try {
    const res = id
      ? await api(`/libros/${id}`, "PUT", datos)
      : await api("/libros", "POST", datos);
    toast(res.mensaje);
    limpiarFormulario();
    cargar();
  } catch (error) {
    toast(error.message, "error");
  }
});

$("cuerpo").addEventListener("click", async (e) => {
  const boton = e.target.closest("button[data-accion]");
  if (!boton) return;
  const libro = libros.find((l) => l.id === Number(boton.dataset.id));
  if (!libro) return;

  if (boton.dataset.accion === "editar") {
    $("libroId").value = libro.id;
    $("titulo").value = libro.titulo;
    $("autor").value = libro.autor;
    $("categoria").value = libro.categoria;
    $("cantidad").value = libro.cantidad;
    $("tituloForm").textContent = "Editar libro";
    $("btnGuardar").textContent = "Guardar cambios";
    $("btnCancelar").hidden = false;
    $("titulo").focus();
    window.scrollTo({ top: 0 });
  } else if (
    confirm(`¿Eliminar “${libro.titulo}”? Esta acción no se puede deshacer.`)
  ) {
    try {
      const res = await api(`/libros/${libro.id}`, "DELETE");
      toast(res.mensaje);
      cargar();
    } catch (error) {
      toast(error.message, "error");
    }
  }
});
