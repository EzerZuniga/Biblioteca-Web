$("formRecuperar").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("error").hidden = true;
  $("aviso").hidden = true;
  $("btnEnviar").disabled = true;
  try {
    const res = await api("/auth/recuperar", "POST", {
      email: $("email").value,
    });
    // El mismo mensaje exista o no la cuenta: el servidor no lo revela.
    $("aviso").textContent = res.mensaje;
    $("aviso").hidden = false;
    $("formRecuperar").reset();
  } catch (error) {
    $("error").textContent = error.message;
    $("error").hidden = false;
  }
  $("btnEnviar").disabled = false;
});
