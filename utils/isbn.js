// Un ISBN se escribe con guiones o espacios ("978-84-376-0494-7"); se guarda
// sin ellos para comparar y buscar siempre igual.
const normalizarIsbn = (texto) => texto.replace(/[\s-]/g, "").toUpperCase();

// El último dígito es de control: detecta errores de tipeo.
const isbn10Valido = (isbn) => {
  if (!/^\d{9}[\dX]$/.test(isbn)) return false;
  const suma = [...isbn].reduce(
    (total, caracter, i) =>
      total + (caracter === "X" ? 10 : Number(caracter)) * (10 - i),
    0,
  );
  return suma % 11 === 0;
};

const isbn13Valido = (isbn) => {
  if (!/^\d{13}$/.test(isbn)) return false;
  const suma = [...isbn].reduce(
    (total, digito, i) => total + Number(digito) * (i % 2 === 0 ? 1 : 3),
    0,
  );
  return suma % 10 === 0;
};

const isbnValido = (isbn) => isbn10Valido(isbn) || isbn13Valido(isbn);

module.exports = { normalizarIsbn, isbnValido };
