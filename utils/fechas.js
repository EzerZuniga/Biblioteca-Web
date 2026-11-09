// Las fechas de préstamo y devolución deben ser las del lugar donde está la
// biblioteca, no las del servidor: Railway corre en UTC, y en Perú (UTC-5)
// desde las 7 de la noche UTC ya es el día siguiente.
const ZONA_HORARIA = process.env.ZONA_HORARIA || "America/Lima";

const crearFormato = (zona) =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

let formato;
try {
  formato = crearFormato(ZONA_HORARIA);
} catch {
  throw new Error(
    `ZONA_HORARIA no es válida: "${ZONA_HORARIA}". Usa un nombre como America/Lima.`,
  );
}

// Devuelve la fecha en formato AAAA-MM-DD según la zona horaria configurada.
const fechaLocal = (momento = new Date()) => {
  const partes = Object.fromEntries(
    formato.formatToParts(momento).map(({ type, value }) => [type, value]),
  );
  return `${partes.year}-${partes.month}-${partes.day}`;
};

module.exports = { fechaLocal, ZONA_HORARIA };
