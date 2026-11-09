const { POR_PAGINA } = require("../validators/common");

// Devuelve una página de resultados y los datos para navegar entre páginas.
// La consulta debe tener un orden estable para que no se repitan ni salten
// filas entre páginas.
async function paginar(
  modelo,
  consulta,
  { pagina = 1, porPagina = POR_PAGINA.porDefecto } = {},
) {
  const { rows, count } = await modelo.findAndCountAll({
    ...consulta,
    limit: porPagina,
    offset: (pagina - 1) * porPagina,
    distinct: true,
  });
  return {
    datos: rows,
    paginacion: {
      pagina,
      porPagina,
      total: count,
      totalPaginas: Math.max(Math.ceil(count / porPagina), 1),
    },
  };
}

module.exports = { paginar };
