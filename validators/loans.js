const { z } = require("zod");
const { entero } = require("./comunes");

const crear = z.object({
  libro_id: entero("Indica un libro válido", { min: 1 }),
});

module.exports = { crear };
