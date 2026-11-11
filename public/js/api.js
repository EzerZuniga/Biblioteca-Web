const $ = (id) => document.getElementById(id);

const BASE_API = "/api/v1";
// Cabecera que el servidor exige para cambiar datos con la cookie de sesión.
const CABECERAS_API = {
  "Content-Type": "application/json",
  "X-Requested-With": "fetch",
};

// El token de sesión vive en una cookie httpOnly que este código no puede
// leer. Aquí solo se guardan el nombre y el rol, para pintar la interfaz.
// Las versiones anteriores guardaban el token: se borra si quedó.
localStorage.removeItem("token");

function getUsuario() {
  try {
    return JSON.parse(localStorage.getItem("usuario"));
  } catch {
    return null;
  }
}

function guardarSesion(usuario) {
  localStorage.setItem("usuario", JSON.stringify(usuario));
}

function olvidarSesion() {
  localStorage.removeItem("usuario");
  location.href = "/login.html";
}

async function cerrarSesion() {
  try {
    await fetch(`${BASE_API}/auth/logout`, {
      method: "POST",
      headers: CABECERAS_API,
    });
  } finally {
    olvidarSesion();
  }
}

function irAlInicio(usuario) {
  location.href =
    usuario.rol === "admin" ? "/admin-loans.html" : "/catalog.html";
}

function protegerPagina(rolRequerido) {
  const usuario = getUsuario();
  if (!usuario) {
    location.href = "/login.html";
    return false;
  }
  if (rolRequerido && usuario.rol !== rolRequerido) {
    irAlInicio(usuario);
    return false;
  }
  return true;
}

// Arma "/ruta?clave=valor" omitiendo los parámetros vacíos.
function conConsulta(ruta, parametros = {}) {
  const consulta = new URLSearchParams(
    Object.entries(parametros).filter(
      ([, valor]) => valor !== undefined && valor !== null && valor !== "",
    ),
  );
  return consulta.size ? `${ruta}?${consulta}` : ruta;
}

async function api(ruta, metodo = "GET", cuerpo = null) {
  // La cookie de sesión la envía el navegador solo (mismo origen).
  const opciones = { method: metodo, headers: CABECERAS_API };
  if (cuerpo) opciones.body = JSON.stringify(cuerpo);

  let respuesta;
  try {
    respuesta = await fetch(BASE_API + ruta, opciones);
  } catch {
    throw new Error("No se pudo conectar con el servidor");
  }
  const datos = await respuesta.json().catch(() => ({}));

  if (respuesta.status === 401 && getUsuario()) {
    olvidarSesion();
    throw new Error(datos.mensaje || "Tu sesión expiró");
  }
  if (respuesta.status === 403 && getUsuario()) {
    await revisarRol();
  }
  if (!respuesta.ok) throw new Error(datos.mensaje || "Ocurrió un error");
  return datos;
}

// Si un administrador cambió el rol de esta cuenta, el rol guardado en el
// navegador quedó viejo. Se consulta el actual y se lleva al usuario a su inicio.
async function revisarRol() {
  try {
    const respuesta = await fetch(`${BASE_API}/auth/yo`);
    if (!respuesta.ok) return;
    const actual = await respuesta.json();
    if (getUsuario()?.rol !== actual.rol) {
      localStorage.setItem("usuario", JSON.stringify(actual));
      irAlInicio(actual);
    }
  } catch {
    // Sin conexión: se muestra el error original.
  }
}

// Dibuja "Anterior · Página X de Y · Siguiente" bajo un listado paginado.
// Se oculta si todo cabe en una página.
function pintarPaginacion(contenedor, paginacion, irAPagina) {
  const { pagina, totalPaginas, total } = paginacion;
  contenedor.replaceChildren();
  contenedor.hidden = totalPaginas <= 1;
  if (contenedor.hidden) return;

  const boton = (texto, destino, deshabilitado) => {
    const elemento = document.createElement("button");
    elemento.type = "button";
    elemento.className = "btn btn-secundario btn-chico";
    elemento.textContent = texto;
    elemento.disabled = deshabilitado;
    elemento.addEventListener("click", () => irAPagina(destino));
    return elemento;
  };
  const resumen = document.createElement("span");
  resumen.textContent = `Página ${pagina} de ${totalPaginas} · ${total} en total`;

  contenedor.append(
    boton("Anterior", pagina - 1, pagina <= 1),
    resumen,
    boton("Siguiente", pagina + 1, pagina >= totalPaginas),
  );
}

function esc(valor) {
  return String(valor ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}

function formatearFecha(fecha) {
  if (!fecha) return "—";
  const [a, m, d] = String(fecha).slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

// Fechas de un préstamo en una sola celda, cada una con su nombre y solo las
// que existen. Sin fechas se marca "sin-dato": en móvil esa fila se oculta.
function celdaFechas(prestamo) {
  const fechas = [
    ["Prestado", prestamo.fecha_prestamo],
    ["Vence", prestamo.fecha_limite],
    ["Devuelto", prestamo.fecha_devolucion],
  ].filter(([, fecha]) => fecha);
  if (!fechas.length) {
    return '<td data-label="Fechas" class="sin-dato"><span class="suave">—</span></td>';
  }
  return `<td data-label="Fechas"><dl class="fechas">${fechas
    .map(
      ([nombre, fecha]) =>
        `<div><dt>${nombre}</dt><dd>${formatearFecha(fecha)}</dd></div>`,
    )
    .join("")}</dl></td>`;
}

// Celda con los botones de una fila: en móvil ocupa todo el ancho.
function celdaAcciones(botones) {
  return `<td data-label="Acciones" class="td-acciones"><div class="celda-acciones">${botones}</div></td>`;
}

const TEXTO_ESTADO = {
  pendiente: "Pendiente",
  prestado: "Prestado",
  devuelto: "Devuelto",
  rechazado: "Rechazado",
  cancelado: "Cancelado",
  vencido: "Vencido",
};

// Un préstamo vencido sigue en estado "prestado"; la API lo marca aparte.
function badgeEstado(estado, vencido = false) {
  const clave = vencido ? "vencido" : estado;
  return `<span class="estado estado-${esc(clave)}">${esc(TEXTO_ESTADO[clave] || clave)}</span>`;
}

// Línea extra bajo la etiqueta: días de retraso o motivo del rechazo.
function detalleEstado(prestamo) {
  if (prestamo.vencido) {
    const dias = prestamo.diasDeRetraso;
    return `<span class="detalle-estado retraso">${dias} ${dias === 1 ? "día" : "días"} de retraso</span>`;
  }
  if (prestamo.estado === "rechazado" && prestamo.motivo_rechazo) {
    return `<span class="detalle-estado">${esc(prestamo.motivo_rechazo)}</span>`;
  }
  return "";
}

function toast(texto, tipo = "ok") {
  let caja = $("toasts");
  if (!caja) {
    caja = document.createElement("div");
    caja.id = "toasts";
    caja.setAttribute("role", "status");
    document.body.appendChild(caja);
  }
  const aviso = document.createElement("div");
  aviso.className = `toast ${tipo === "error" ? "error" : ""}`;
  aviso.textContent = texto;
  caja.appendChild(aviso);
  // Sin animaciones: el aviso aparece y desaparece. Los errores duran más
  // para que dé tiempo a leerlos.
  setTimeout(() => aviso.remove(), tipo === "error" ? 7000 : 4000);
}

const iniciales = (nombre) =>
  String(nombre || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();

function renderNavbar() {
  const usuario = getUsuario();
  if (!usuario) return;

  const enlaces =
    usuario.rol === "admin"
      ? [
          ["/admin-loans.html", "Préstamos"],
          ["/admin-books.html", "Libros"],
          ["/admin-users.html", "Usuarios"],
          ["/admin-activity.html", "Actividad"],
        ]
      : [
          ["/catalog.html", "Catálogo"],
          ["/my-loans.html", "Mis préstamos"],
        ];

  const barra = document.createElement("header");
  barra.className = "barra";
  barra.innerHTML = `
    <div class="barra-interior">
      <a class="marca" href="/" aria-label="BookSmart, ir al inicio">
        <img src="/images/logo.webp" alt="" width="510" height="128" />
      </a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu-principal" aria-label="Abrir menú">
        <span class="menu-icono" aria-hidden="true"></span>
      </button>
      <div class="menu-fondo" aria-hidden="true"></div>
      <div class="menu" id="menu-principal">
        <div class="menu-cabecera">
          <img src="/images/logo.webp" alt="" width="510" height="128" />
          <button class="menu-cerrar" type="button" aria-label="Cerrar menú">
            <span class="icono-cerrar" aria-hidden="true"></span>
          </button>
        </div>
        <nav aria-label="Principal">
          ${enlaces
            .map(
              ([href, texto]) =>
                `<a href="${href}" ${location.pathname === href ? 'aria-current="page"' : ""}>${texto}</a>`,
            )
            .join("")}
        </nav>
        <div class="sesion">
          <span class="avatar" aria-hidden="true">${esc(iniciales(usuario.nombre))}</span>
          <span class="sesion-datos">
            <span class="sesion-nombre">${esc(usuario.nombre)}</span>
            <span class="sesion-rol">${usuario.rol === "admin" ? "Administrador" : "Lector"}</span>
          </span>
          <button class="btn btn-secundario btn-chico" id="btnSalir" type="button">Cerrar sesión</button>
        </div>
      </div>
    </div>`;
  document.body.prepend(barra);

  // Para quien navega con teclado: saltar el menú e ir directo al contenido.
  const saltar = document.createElement("a");
  saltar.className = "saltar";
  saltar.href = "#principal";
  saltar.textContent = "Saltar al contenido";
  document.body.prepend(saltar);

  // Menú lateral (solo móvil). Mientras está abierto, todo lo que queda detrás
  // se vuelve inerte: no recibe foco ni clics, así el teclado y el lector de
  // pantalla se quedan dentro del panel.
  const botonMenu = barra.querySelector(".menu-toggle");
  const botonCerrar = barra.querySelector(".menu-cerrar");
  const fondo = barra.querySelector(".menu-fondo");
  const detras = () => [
    ...[...document.body.children].filter((el) => el !== barra),
    barra.querySelector(".marca"),
    botonMenu,
  ];
  const menuAbierto = () => barra.classList.contains("menu-abierto");

  const abrirMenu = () => {
    barra.classList.add("menu-abierto");
    document.documentElement.classList.add("sin-scroll");
    botonMenu.setAttribute("aria-expanded", "true");
    detras().forEach((el) => (el.inert = true));
    botonCerrar.focus();
  };

  const cerrarMenu = ({ devolverFoco = false } = {}) => {
    if (!menuAbierto()) return;
    barra.classList.remove("menu-abierto");
    document.documentElement.classList.remove("sin-scroll");
    botonMenu.setAttribute("aria-expanded", "false");
    detras().forEach((el) => (el.inert = false));
    if (devolverFoco) botonMenu.focus();
  };

  botonMenu.addEventListener("click", abrirMenu);
  botonCerrar.addEventListener("click", () =>
    cerrarMenu({ devolverFoco: true }),
  );
  fondo.addEventListener("click", () => cerrarMenu({ devolverFoco: true }));

  barra.querySelectorAll("nav a").forEach((enlace) => {
    enlace.addEventListener("click", () => cerrarMenu());
  });

  document.addEventListener("keydown", (evento) => {
    if (evento.key === "Escape" && menuAbierto()) {
      cerrarMenu({ devolverFoco: true });
    }
  });

  // Mismo punto de corte que el CSS: en pantallas anchas el menú va en línea.
  matchMedia("(min-width: 60rem)").addEventListener("change", (consulta) => {
    if (consulta.matches) cerrarMenu();
  });

  $("btnSalir").addEventListener("click", cerrarSesion);
}
