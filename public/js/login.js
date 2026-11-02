const sesion = getUsuario();
if (getToken() && sesion) irAlInicio(sesion);

if (new URLSearchParams(location.search).get("registrado")) {
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
    guardarSesion(datos.token, datos.usuario);
    irAlInicio(datos.usuario);
  } catch (error) {
    $("error").textContent = error.message;
    $("error").hidden = false;
    $("btnEntrar").disabled = false;
  }
});
