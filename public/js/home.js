// Solo decide a dónde ir. Si la cookie de sesión ya venció, la primera
// petición a la API responde 401 y la página lleva al login.
const leerUsuario = () => {
  try {
    return JSON.parse(localStorage.getItem("usuario"));
  } catch {
    return null;
  }
};

const usuario = leerUsuario();
if (!usuario) location.replace("/login.html");
else
  location.replace(
    usuario.rol === "admin" ? "/admin-loans.html" : "/catalog.html",
  );
