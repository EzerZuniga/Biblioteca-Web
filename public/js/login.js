const sesion = getUsuario();
if (sesion) irAlInicio(sesion);

// Aviso según de dónde viene el usuario.
const AVISOS = {
  registrado: "Tu cuenta está lista. Inicia sesión para continuar.",
  restablecida: "Tu contraseña se actualizó. Inicia sesión con la nueva.",
};
const parametros = new URLSearchParams(location.search);
const motivo = Object.keys(AVISOS).find((clave) => parametros.get(clave));
if (motivo) {
  $("aviso").textContent = AVISOS[motivo];
  $("aviso").hidden = false;
}

$("formLogin").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("error").hidden = true;
  $("btnEntrar").disabled = true;
  try {
    const datos = await api("/auth/login", "POST", {
      email: $("email").value,
      password: $("password").value,
    });
    guardarSesion(datos.usuario);
    irAlInicio(datos.usuario);
  } catch (error) {
    $("error").textContent = error.message;
    $("error").hidden = false;
    $("btnEntrar").disabled = false;
  }
});
