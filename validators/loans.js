const { z } = require("zod");
const { entero } = require("./common");

const crear = z.object({
  libro_id: entero("Indica un libro válido", { min: 1 }),
});

module.exports = { crear };
