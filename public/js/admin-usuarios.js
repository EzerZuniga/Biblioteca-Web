let usuarios = [];
const yo = getUsuario();

if (protegerPagina('admin')) {
  renderNavbar();
  cargar();
}

async function cargar() {
  try {
    usuarios = await api('/usuarios');
    pintar();
  } catch (error) {
    toast(error.message, 'error');
  }
}

function pintar() {
  $('cuerpo').innerHTML = usuarios.map((u) => `
    <tr>
      <td><strong>${esc(u.nombre)}</strong></td>
      <td>${esc(u.email)}</td>
      <td>${u.rol === 'admin' ? 'Administrador' : 'Usuario'}</td>
      <td class="acciones-celda">
        <button class="btn btn-secundario btn-chico" data-accion="editar" data-id="${u.id}">Editar</button>
        ${u.id === yo.id ? '' : `<button class="btn btn-peligro btn-chico" data-accion="eliminar" data-id="${u.id}">Eliminar</button>`}
      </td>
    </tr>`).join('');
}

function cerrarFormulario() {
  $('formUsuario').reset();
  $('usuarioId').value = '';
  $('panelForm').hidden = true;
}

$('btnCancelar').addEventListener('click', cerrarFormulario);

$('formUsuario').addEventListener('submit', async (e) => {
  e.preventDefault();
  const datos = { nombre: $('nombre').value, email: $('email').value, rol: $('rol').value };
  if ($('password').value) datos.password = $('password').value;
  try {
    const res = await api(`/usuarios/${$('usuarioId').value}`, 'PUT', datos);
    toast(res.mensaje);
    cerrarFormulario();
    cargar();
  } catch (error) {
    toast(error.message, 'error');
  }
});

$('cuerpo').addEventListener('click', async (e) => {
  const boton = e.target.closest('button[data-accion]');
  if (!boton) return;
  const usuario = usuarios.find((u) => u.id === Number(boton.dataset.id));
  if (!usuario) return;

  if (boton.dataset.accion === 'editar') {
    $('usuarioId').value = usuario.id;
    $('nombre').value = usuario.nombre;
    $('email').value = usuario.email;
    $('rol').value = usuario.rol;
    $('password').value = '';
    $('panelForm').hidden = false;
    $('nombre').focus();
    window.scrollTo({ top: 0 });
  } else if (confirm(`¿Eliminar a ${usuario.nombre}? Esta acción no se puede deshacer.`)) {
    try {
      const res = await api(`/usuarios/${usuario.id}`, 'DELETE');
      toast(res.mensaje);
      cargar();
    } catch (error) {
      toast(error.message, 'error');
    }
  }
});
