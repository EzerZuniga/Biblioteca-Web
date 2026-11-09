// Reglas de préstamo configurables por variables de entorno. Un valor inválido
// impide arrancar con un mensaje claro, en lugar de prestar con reglas raras.
const enteroDeEntorno = (nombre, porDefecto, { min, max }) => {
  const crudo = process.env[nombre];
  if (crudo === undefined || crudo === "") return porDefecto;
  const valor = Number(crudo);
  if (!Number.isInteger(valor) || valor < min || valor > max) {
    throw new Error(
      `${nombre} debe ser un número entero entre ${min} y ${max}`,
    );
  }
  return valor;
};

module.exports = {
  // Días que el lector tiene para devolver un libro desde que se aprueba.
  DIAS_PRESTAMO: enteroDeEntorno("DIAS_PRESTAMO", 14, { min: 1, max: 365 }),
  // Solicitudes pendientes más libros en préstamo que puede tener a la vez.
  MAX_PRESTAMOS_ACTIVOS: enteroDeEntorno("MAX_PRESTAMOS_ACTIVOS", 3, {
    min: 1,
    max: 50,
  }),
};
