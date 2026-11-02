/* ===== Utilidades compartidas por todas las páginas ===== */

const $ = (id) => document.getElementById(id);

// ----- Sesión (el token y los datos del usuario viven en localStorage) -----
function getToken() { return localStorage.getItem('token'); }

function getUsuario() {
  try { return JSON.parse(localStorage.getItem('usuario')); } catch { return null; }
}

function guardarSesion(token, usuario) {
  localStorage.setItem('token', token);
  localStorage.setItem('usuario', JSON.stringify(usuario));
}

function cerrarSesion() {
  localStorage.clear();
  location.href = '/login.html';
}

function irAlInicio(usuario) {
  location.href = usuario.rol === 'admin' ? '/admin-prestamos.html' : '/catalogo.html';
}

// Protege una página. OJO: esto solo mejora la experiencia; la seguridad real
// está en los middlewares del backend (verificarToken y soloAdmin).
function protegerPagina(rolRequerido) {
  const usuario = getUsuario();
  if (!getToken() || !usuario) { location.href = '/login.html'; return false; }
  if (rolRequerido && usuario.rol !== rolRequerido) { irAlInicio(usuario); return false; }
  return true;
}

// ----- Llamadas al backend -----
async function api(ruta, metodo = 'GET', cuerpo = null) {
  const opciones = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if (getToken()) opciones.headers.Authorization = `Bearer ${getToken()}`;
  if (cuerpo) opciones.body = JSON.stringify(cuerpo);

  let respuesta;
  try {
    respuesta = await fetch(ruta, opciones);
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  const datos = await respuesta.json().catch(() => ({}));

  if (respuesta.status === 401 && getToken()) {
    cerrarSesion(); // el token venció
    throw new Error(datos.mensaje || 'Tu sesión expiró');
  }
  if (!respuesta.ok) throw new Error(datos.mensaje || 'Ocurrió un error');
  return datos;
}

// ----- Ayudas de presentación -----
// Escapa texto antes de meterlo en innerHTML (evita inyección de HTML/JS)
function esc(valor) {
  return String(valor ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function formatearFecha(fecha) {
  if (!fecha) return '—';
  const [a, m, d] = String(fecha).slice(0, 10).split('-');
  return `${d}/${m}/${a}`;
}

function badgeEstado(estado) {
  const texto = { pendiente: 'Pendiente', prestado: 'Prestado', devuelto: 'Devuelto' }[estado] || estado;
  return `<span class="estado estado-${esc(estado)}">${texto}</span>`;
}

function toast(texto, tipo = 'ok') {
  let caja = $('toasts');
  if (!caja) {
    caja = document.createElement('div');
    caja.id = 'toasts';
    caja.setAttribute('role', 'status');
    document.body.appendChild(caja);
  }
  const aviso = document.createElement('div');
  aviso.className = `toast ${tipo === 'error' ? 'error' : ''}`;
  aviso.textContent = texto;
  caja.appendChild(aviso);
  setTimeout(() => aviso.classList.add('sale'), 3800);
  setTimeout(() => aviso.remove(), 4100);
}

function renderNavbar() {
  const usuario = getUsuario();
  if (!usuario) return;

  const enlaces = usuario.rol === 'admin'
    ? [['/admin-prestamos.html', 'Préstamos'], ['/admin-libros.html', 'Libros'], ['/admin-usuarios.html', 'Usuarios']]
    : [['/catalogo.html', 'Catálogo'], ['/mis-prestamos.html', 'Mis préstamos']];

  const barra = document.createElement('header');
  barra.className = 'barra';
  barra.innerHTML = `
    <div class="barra-interior">
      <a class="marca" href="/">Biblioteca</a>
      <nav aria-label="Principal">
        ${enlaces.map(([href, texto]) =>
          `<a href="${href}" ${location.pathname === href ? 'aria-current="page"' : ''}>${texto}</a>`).join('')}
      </nav>
      <div class="sesion">
        <span>${esc(usuario.nombre)}</span>
        <button class="btn btn-secundario btn-chico" id="btnSalir" type="button">Cerrar sesión</button>
      </div>
    </div>`;
  document.body.prepend(barra);
  $('btnSalir').addEventListener('click', cerrarSesion);
}
