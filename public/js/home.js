const usuario = JSON.parse(localStorage.getItem("usuario") || "null");
if (!localStorage.getItem("token") || !usuario) location.replace("/login.html");
else
  location.replace(
    usuario.rol === "admin" ? "/admin-loans.html" : "/catalog.html",
  );
