# Sistema Web de Gestión de Biblioteca

Node.js + Express + Sequelize + MySQL + bcrypt + JWT + zod. Frontend en HTML/CSS/JS puro servido por Express.

[![CI](https://github.com/EzerZuniga/Biblioteca-Web/actions/workflows/ci.yml/badge.svg)](https://github.com/EzerZuniga/Biblioteca-Web/actions/workflows/ci.yml)

## Cómo ejecutarlo

Necesitas Node.js 24 (la versión está fijada en `.nvmrc` y en `engines`) y MySQL.

1. Instalar dependencias: `npm install`
2. Crear la base de datos vacía (pide la contraseña de tu MySQL): `mysql -u root -p -e "source database/create-database.sql"`
3. Copiar `.env.example` a `.env` y completar `DB_PASS` (y cambiar `JWT_SECRET`).
4. Crear el administrador (ver abajo).
5. Iniciar: `npm start` (o `npm run dev` para reiniciar solo al guardar)
6. Abrir http://localhost:3000

Al arrancar, la app crea las tablas que falten, aplica las migraciones
pendientes y carga los libros de ejemplo si la tabla está vacía.
Los usuarios normales se crean desde la página de registro.

## Comandos

| Comando                | Qué hace                                                      |
| ---------------------- | ------------------------------------------------------------- |
| `npm start`            | Inicia el servidor (`server.js`)                              |
| `npm run dev`          | Inicia y reinicia al guardar cambios                          |
| `npm test`             | Todos los tests                                               |
| `npm run test:unit`    | Solo los tests que no usan base de datos                      |
| `npm run lint`         | Revisa el código con ESLint (`lint:fix` corrige lo que puede) |
| `npm run format`       | Formatea con Prettier (`format:check` solo revisa)            |
| `npm run check`        | Lint, formato y tests: lo mismo que corre la CI               |
| `npm run create-admin` | Crea o actualiza el administrador                             |
| `npm run migrate`      | Aplica a mano las migraciones pendientes                      |
| `npm run backup`       | Respaldo completo de la base con mysqldump                    |

## Tests

Usan el test runner de Node y Supertest. Los de integración necesitan el MySQL
local del `.env`, con un usuario que pueda crear bases. Cada archivo crea su
propia base `biblioteca_test_<proceso>` y la borra al terminar, así que tu base
de desarrollo no se toca y los archivos corren en paralelo.

Por seguridad, los tests se niegan a correr si `DB_HOST` no es local, porque
crean y borran bases de datos. Así un `.env` que apunte a Railway no puede
dañar producción.

## Integración continua

En cada push a `main` y en cada pull request, GitHub Actions
(`.github/workflows/ci.yml`) corre dos trabajos:

- **Lint y formato:** ESLint, Prettier y `npm audit` (falla con vulnerabilidades
  altas en dependencias de producción).
- **Tests:** la suite completa contra un MySQL 8.4 propio del workflow.

Conviene configurar en GitHub que `main` exija que la CI pase antes de
fusionar (Settings → Branches → Branch protection rules) y que Railway solo
despliegue con la CI en verde (en el servicio: Settings → "Wait for CI").

Dependabot (`.github/dependabot.yml`) abre cada semana un pull request con las
actualizaciones de dependencias, y cada mes con las de GitHub Actions. La CI
los prueba antes de que decidas fusionarlos.

## Crear o cambiar el administrador

Ni el script SQL ni el arranque crean cuentas con contraseña fija.

**Primer administrador automático.** Si la base no tiene ningún administrador y
están definidas las variables `ADMIN_EMAIL` y `ADMIN_PASSWORD`, la app lo crea al
arrancar. En Railway basta con agregarlas en Variables. Cuando ya exista, puedes
borrar `ADMIN_PASSWORD` de Railway: la app no vuelve a tocar esa cuenta.

**Crear o cambiar la contraseña a mano.** El comando `create-admin` lee
el email y la contraseña desde variables de entorno, así ninguna contraseña
queda guardada en el repositorio. Si el email ya existe, actualiza su contraseña,
le da rol de administrador y cierra sus sesiones abiertas.

La contraseña debe tener al menos 10 caracteres, con letras y números.

PowerShell:

```powershell
$env:ADMIN_EMAIL="admin@tu-dominio.com"; $env:ADMIN_PASSWORD="una-clave-larga-123"; npm run create-admin
```

Bash:

```bash
ADMIN_EMAIL=admin@tu-dominio.com ADMIN_PASSWORD=una-clave-larga-123 npm run create-admin
```

En Railway, ejecútalo dentro del servicio para que use las variables de la base de producción:

```bash
railway ssh
ADMIN_EMAIL=admin@tu-dominio.com ADMIN_PASSWORD=una-clave-larga-123 npm run create-admin
```

## Migraciones

Los cambios de estructura o de datos de la base viven en `database/migrations/`.
La app aplica en orden las que faltan cada vez que arranca y las registra en la
tabla `migraciones`, así que nunca se aplican dos veces. También se pueden
aplicar a mano con `npm run migrate`.

Para crear una nueva, agrega un archivo `NNN-descripcion-en-ingles.js` que
exporte `up({ sequelize, transaction })`. Ojo: en MySQL los cambios de
estructura (`ALTER TABLE`, `CREATE TABLE`) no se pueden deshacer dentro de una
transacción, así que esas migraciones deben revisar el estado antes de cada
paso.

Nunca renombres un archivo de migración sin agregarlo a `RENOMBRADAS` en
`database/migrate.js`: la tabla guarda el nombre del archivo, y sin esa
traducción la migración se volvería a aplicar.

## Respaldos

`npm run backup` guarda una copia completa de la base en `backups/`, con la
fecha y hora en el nombre. Esa carpeta está fuera de git porque contiene datos
personales. Usa las variables `DB_*` y necesita `mysqldump`, que viene con MySQL.

**Respaldar Railway.** En Railway, abre el servicio MySQL y copia los datos de
conexión pública de la pestaña Variables (`MYSQL_PUBLIC_URL`, con la forma
`mysql://usuario:clave@host:puerto/base`). Crea un archivo `.env.railway`, que
git ya ignora, con esos datos:

```
DB_HOST=host-publico.proxy.rlwy.net
DB_PORT=12345
DB_USER=root
DB_PASS=la-clave
DB_NAME=railway
```

Y ejecuta:

```bash
node --env-file=.env.railway scripts/backup.js
```

Así las credenciales de producción no quedan cargadas en tu terminal, y un
`npm run dev` posterior sigue usando tu base local.

**Restaurar.** Primero prueba en una base local vacía. Restaurar sobre una base
existente reemplaza sus tablas.

```bash
mysql --host=localhost --user=root -p biblioteca_restaurada -e "source backups/archivo.sql"
```

Además, revisa la pestaña Backups del servicio MySQL en Railway y programa
respaldos automáticos si tu plan lo permite. Un respaldo manual antes de cada
despliegue con migraciones es una buena costumbre.

## Seguridad

- **Límite de intentos.** El login bloquea una IP tras 10 intentos fallidos en
  15 minutos; los ingresos correctos no cuentan. El registro permite 5 cuentas
  por hora por IP, y la API entera 300 peticiones por minuto por IP.
- **Cabeceras.** helmet envía una política de contenido que solo permite
  scripts propios, protección contra clickjacking y HSTS. Por eso el HTML no
  debe tener scripts en línea: todo va en `public/js/`.
- **CORS cerrado.** El frontend se sirve desde el mismo dominio, así que otros
  sitios no pueden llamar a la API desde el navegador.
- **Proxy.** La app confía en un proxy delante (`trust proxy` = 1), que es lo que
  pone Railway, para leer la IP real. Si agregas otro intermediario, como
  Cloudflare, sube ese número o los límites verán la IP del intermediario.
- Los contadores de intentos viven en memoria: se reinician al redesplegar y
  no se comparten si algún día corres varias instancias.

## Estructura

Los nombres de carpetas y archivos van en inglés. Los textos de la interfaz,
los mensajes y los comentarios van en español.

```
biblioteca-web/
├── server.js                    punto de entrada: prepara la base y escucha
├── app.js                       arma la app de Express (la usan server.js y los tests)
├── config/db.js                 conexión Sequelize -> MySQL
├── models/                      User, Book, Loan + relaciones (index.js)
├── routes/                      auth, users, books, loans + legacyRedirects
├── middlewares/                 auth, security, errors, validate
├── validators/                  esquemas zod: auth, users, books, loans, common
├── controllers/                 auth, user, book, loan
├── services/                    lógica de negocio: auth, users, books, loans,
│                                inventory (ejemplares disponibles)
├── utils/                       errors y dates
├── database/create-database.sql crea la base vacía (las tablas las crea la app)
├── database/migrations/         cambios de la base, se aplican al arrancar
├── database/migrate.js          ejecuta las migraciones pendientes
├── database/prepare.js          tablas + migraciones + datos iniciales
├── database/seed.js             libros de ejemplo y administrador inicial
├── scripts/                     create-admin, migrate, backup
├── test/unit/                   esquemas, errores y fechas (sin base de datos)
├── test/integration/            API, servicios, páginas y migraciones contra MySQL
├── test/helpers/                base temporal, cliente HTTP y datos de prueba
├── .github/                     CI (workflows/ci.yml) y Dependabot
└── public/                      frontend
    ├── css/styles.css
    ├── images/logo.png
    ├── js/                      api.js (compartido) + un script por página
    └── login, register, catalog, my-loans,
        admin-books, admin-loans, admin-users (.html)
```

Las direcciones anteriores de las páginas, como `/catalogo.html`, redirigen
de forma permanente a las nuevas (`routes/legacyRedirects.js`).

## Flujo de un préstamo

`pendiente` (usuario solicita, se genera el código con crypto) → `prestado` (admin aprueba) → `devuelto` (admin registra devolución).

En `libros`, `cantidad` es el total de ejemplares. Los disponibles se calculan
como `cantidad` menos los préstamos en estado `prestado`, y la API los devuelve
en el campo `disponibles`. Aprobar un préstamo y editar un libro bloquean la
fila del libro, así dos operaciones simultáneas no pueden prestar más
ejemplares de los que existen.

## API

| Método              | Ruta                                            | Quién                             |
| ------------------- | ----------------------------------------------- | --------------------------------- |
| POST                | /auth/register, /auth/login                     | Público                           |
| GET                 | /auth/yo (datos y rol actuales de la sesión)    | Con sesión                        |
| GET / PUT / DELETE  | /usuarios, /usuarios/:id                        | Admin                             |
| GET                 | /libros (`?titulo=`)                            | Con sesión                        |
| POST / PUT / DELETE | /libros, /libros/:id                            | Admin                             |
| POST                | /prestamos                                      | Usuario                           |
| GET                 | /prestamos                                      | Admin: todos · Usuario: los suyos |
| PUT                 | /prestamos/:id/aprobar, /prestamos/:id/devolver | Admin                             |

## Capas

Cada petición pasa por cuatro capas, y cada una tiene una sola responsabilidad:

1. **Rutas** (`routes/`): sesión, rol y validación del esquema.
2. **Controladores** (`controllers/`): leen la petición, llaman al servicio y
   arman la respuesta HTTP. No tocan la base.
3. **Servicios** (`services/`): reglas de negocio y transacciones. No saben nada
   de HTTP, así que se pueden usar desde scripts o probar sin servidor.
4. **Modelos** (`models/`): tablas y relaciones de Sequelize.

Los servicios lanzan errores con significado (`SolicitudInvalida`,
`NoAutenticado`, `SinPermiso`, `NoEncontrado`, `Conflicto`) y el manejador
central de `middlewares/errors.js` los traduce a 400, 401, 403, 404 y 409.
Los errores siempre responden `{ "mensaje": "..." }`. Los inesperados responden
500 sin detalles y quedan registrados con el método y la ruta.

Cada ruta valida su cuerpo, sus parámetros y su búsqueda con un esquema de
`validators/` antes de llegar al controlador. El esquema normaliza los datos,
por ejemplo quita espacios y pasa el email a minúsculas, y descarta los campos
que no conoce. Si algo no cumple, la respuesta es 400 e incluye el detalle por
campo: `{ "mensaje": "...", "errores": [{ "campo": "...", "mensaje": "..." }] }`.
Los controladores reciben datos ya validados y solo aplican reglas de negocio.

Las fechas de préstamo y devolución usan la zona horaria de la variable
`ZONA_HORARIA`, que por defecto es `America/Lima`. No dependen del reloj del
servidor, que en Railway está en UTC.

En cada petición con sesión, el servidor lee el usuario desde la base. Si un
administrador cambia el rol de alguien o elimina su cuenta, el cambio aplica en
la siguiente petición. Cambiar una contraseña cierra todas las sesiones que se
abrieron con la contraseña anterior.

## Qué archivos toca cada integrante

| Integrante                | Archivos                                                                                                                                                                         |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Líder + frontend          | `public/**`                                                                                                                                                                      |
| Base de datos + esqueleto | `database/**`, `models/**`, `config/db.js`, `app.js`, `server.js`                                                                                                                |
| Auth y usuarios           | `controllers/authController.js`, `controllers/userController.js`, `services/auth.js`, `services/users.js`, `middlewares/auth.js`, `routes/authRoutes.js`, `routes/userRoutes.js` |
| Libros                    | `controllers/bookController.js`, `services/books.js`, `services/inventory.js`, `routes/bookRoutes.js`                                                                            |
| Préstamos                 | `controllers/loanController.js`, `services/loans.js`, `routes/loanRoutes.js`                                                                                                     |
