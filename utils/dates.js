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

// Marca de fecha y hora local para nombres de archivo: AAAAMMDD-HHMM.
const marcaLocal = (momento = new Date()) => {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: ZONA_HORARIA,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(momento)
      .map(({ type, value }) => [type, value]),
  );
  return `${partes.year}${partes.month}${partes.day}-${partes.hour}${partes.minute}`;
};

// Aritmética de fechas AAAA-MM-DD en UTC: sin horas de por medio, el cambio
// de horario o la zona del servidor no pueden correr un día.
const DIA_MS = 24 * 60 * 60 * 1000;
const aUTC = (fecha) => {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return Date.UTC(anio, mes - 1, dia);
};

const sumarDias = (fecha, dias) =>
  new Date(aUTC(fecha) + dias * DIA_MS).toISOString().slice(0, 10);

const diasEntre = (desde, hasta) =>
  Math.round((aUTC(hasta) - aUTC(desde)) / DIA_MS);

module.exports = {
  fechaLocal,
  marcaLocal,
  sumarDias,
  diasEntre,
  ZONA_HORARIA,
};
