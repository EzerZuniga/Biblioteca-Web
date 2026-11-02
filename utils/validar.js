const emailValido = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const enteroNoNegativo = (valor) => valor !== '' && Number.isInteger(Number(valor)) && Number(valor) >= 0;

module.exports = { emailValido, enteroNoNegativo };