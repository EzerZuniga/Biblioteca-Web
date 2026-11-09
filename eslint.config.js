const js = require("@eslint/js");
const globals = require("globals");
const prettier = require("eslint-config-prettier");

// Funciones que public/js/api.js define y usan las demás páginas.
const COMPARTIDAS_DEL_FRONTEND = [
  "$",
  "api",
  "badgeEstado",
  "cerrarSesion",
  "esc",
  "formatearFecha",
  "getToken",
  "getUsuario",
  "guardarSesion",
  "irAlInicio",
  "protegerPagina",
  "renderNavbar",
  "toast",
];

module.exports = [
  { ignores: ["node_modules/", "backups/", "coverage/"] },
  js.configs.recommended,
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      eqeqeq: ["error", "always", { null: "ignore" }],
      "no-var": "error",
      "prefer-const": "error",
      "no-unused-vars": ["error", { caughtErrors: "none" }],
    },
  },
  {
    files: ["public/js/**/*.js"],
    languageOptions: {
      sourceType: "script",
      globals: {
        ...globals.browser,
        ...Object.fromEntries(
          COMPARTIDAS_DEL_FRONTEND.map((nombre) => [nombre, "readonly"]),
        ),
      },
    },
    rules: {
      // Cada página es un script clásico: sus funciones globales se usan desde
      // otros archivos o desde el HTML.
      "no-unused-vars": ["error", { vars: "local", caughtErrors: "none" }],
    },
  },
  {
    // api.js es quien define las funciones compartidas.
    files: ["public/js/api.js"],
    rules: { "no-redeclare": "off" },
  },
  prettier,
];
