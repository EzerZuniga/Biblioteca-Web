const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const enteroNoNegativo = (valor) =>
  valor !== "" && Number.isInteger(Number(valor)) && Number(valor) >= 0;

const MIN_LARGO_ADMIN = 10;
const contrasenaSegura = (clave) =>
  clave.length >= MIN_LARGO_ADMIN && /[a-zA-Z]/.test(clave) && /\d/.test(clave);

module.exports = {
  emailValido,
  enteroNoNegativo,
  contrasenaSegura,
  MIN_LARGO_ADMIN,
};
