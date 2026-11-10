// El token se lee y se quita de la barra de direcciones: así no queda en el
// historial del navegador ni a la vista de quien mire la pantalla.
const token = new URLSearchParams(location.search).get("token");
history.replaceState(null, "", location.pathname);

const mostrarError = (mensaje) => {
  $("error").textContent = mensaje;
  $("error").hidden = false;
};

if (!token) {
  mostrarError("Este enlace no es válido. Pide uno nuevo.");
  $("btnGuardar").disabled = true;
}

$("formRestablecer").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("error").hidden = true;

  if ($("password").value !== $("password2").value) {
    mostrarError("Las contraseñas no coinciden");
    return;
  }

  $("btnGuardar").disabled = true;
  try {
    await api("/auth/restablecer", "POST", {
      token,
      password: $("password").value,
    });
    localStorage.removeItem("usuario");
    location.href = "/login.html?restablecida=1";
  } catch (error) {
    mostrarError(error.message);
    $("btnGuardar").disabled = false;
  }
});
