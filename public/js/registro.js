const sesion = getUsuario();
if (getToken() && sesion) irAlInicio(sesion);

$("formRegistro").addEventListener("submit", async (e) => {
  e.preventDefault();
  const error = $("error");
  error.hidden = true;

  if ($("password").value !== $("password2").value) {
    error.textContent = "Las contraseñas no coinciden";
    error.hidden = false;
    return;
  }

  $("btnCrear").disabled = true;
  try {
    await api("/auth/register", "POST", {
      nombre: $("nombre").value,
      email: $("email").value,
      password: $("password").value,
    });
    location.href = "/login.html?registrado=1";
  } catch (err) {
    error.textContent = err.message;
    error.hidden = false;
    $("btnCrear").disabled = false;
  }
});
