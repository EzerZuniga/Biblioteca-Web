# Sistema Web de Gestión de Biblioteca

Node.js + Express + Sequelize + MySQL + bcrypt + JWT + crypto. Frontend en HTML/CSS/JS puro servido por Express.

## Cómo ejecutarlo

1. Instalar dependencias: `npm install`
2. Crear la base de datos vacía (pide la contraseña de tu MySQL): `mysql -u root -p -e "source database/biblioteca.sql"`
3. Copiar `.env.example` a `.env` y completar `DB_PASS` (y cambiar `JWT_SECRET`).
4. Crear el administrador (ver abajo).
5. Iniciar: `npm start`  (o `npm run dev` para reiniciar solo al guardar)
6. Abrir http://localhost:3000

Al arrancar, la app crea las tablas que falten, aplica las migraciones
pendientes y carga los libros de ejemplo si la tabla está vacía.
Los usuarios normales se crean desde la página de registro.

## Crear o cambiar el administrador

Ni el script SQL ni el arranque crean cuentas con contraseña fija.

**Primer administrador automático.** Si la base no tiene ningún administrador y
están definidas las variables `ADMIN_EMAIL` y `ADMIN_PASSWORD`, la app lo crea al
arrancar. En Railway basta con agregarlas en Variables. Cuando ya exista, puedes
borrar `ADMIN_PASSWORD` de Railway: la app no vuelve a tocar esa cuenta.

**Crear o cambiar la contraseña a mano.** El comando `crear-admin` lee
el email y la contraseña desde variables de entorno, así ninguna contraseña
queda guardada en el repositorio. Si el email ya existe, actualiza su contraseña
y le da rol de administrador.

La contraseña debe tener al menos 10 caracteres, con letras y números.

PowerShell:

```powershell
$env:ADMIN_EMAIL="admin@tu-dominio.com"; $env:ADMIN_PASSWORD="una-clave-larga-123"; npm run crear-admin
```

Bash:

```bash
ADMIN_EMAIL=admin@tu-dominio.com ADMIN_PASSWORD=una-clave-larga-123 npm run crear-admin
```

En Railway, ejecútalo dentro del servicio para que use las variables de la base de producción:

```bash
railway ssh
ADMIN_EMAIL=admin@tu-dominio.com ADMIN_PASSWORD=una-clave-larga-123 npm run crear-admin
```

## Migraciones

Los cambios de estructura o de datos de la base viven en `database/migraciones/`.
La app aplica en orden las que faltan cada vez que arranca y las registra en la
tabla `migraciones`, así que nunca se aplican dos veces. También se pueden
aplicar a mano con `npm run migrar`.

Para crear una nueva, agrega un archivo `NNN-descripcion.js` que exporte
`up({ sequelize, transaction })`. Ojo: en MySQL los cambios de estructura
(`ALTER TABLE`, `CREATE TABLE`) no se pueden deshacer dentro de una transacción.

## Respaldos

`npm run respaldo` guarda una copia completa de la base en `respaldos/`, con la
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
node --env-file=.env.railway scripts/respaldo.js
```

Así las credenciales de producción no quedan cargadas en tu terminal, y un
`npm run dev` posterior sigue usando tu base local.

**Restaurar.** Primero prueba en una base local vacía. Restaurar sobre una base
existente reemplaza sus tablas.

```bash
mysql --host=localhost --user=root -p biblioteca_restaurada -e "source respaldos/archivo.sql"
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

```
biblioteca-web/
├── app.js                       servidor Express
├── package.json
├── .env.example                 copiar a .env
├── config/db.js                 conexión Sequelize -> MySQL
├── models/                      Usuario, Libro, Prestamo + relaciones (index.js)
├── middlewares/auth.js          verificarToken, soloAdmin, soloUsuario
├── middlewares/seguridad.js     helmet y límites de intentos
├── middlewares/errores.js       manejador central de errores y 404
├── middlewares/validar.js       aplica los esquemas de validaciones/
├── validaciones/                esquemas zod: auth, usuarios, libros, prestamos
├── controllers/                 auth, usuario, libro, prestamo
├── routes/                      auth, usuario, libro, prestamo
├── utils/                       errores y fechas
├── database/biblioteca.sql      crea la base vacía (las tablas las crea la app)
├── database/migraciones/        cambios de la base, se aplican al arrancar
├── database/migrar.js           ejecuta las migraciones pendientes
├── database/seed.js             libros de ejemplo y administrador inicial
├── services/inventario.js       cálculo de ejemplares disponibles
├── scripts/crear-admin.js       crea o actualiza el administrador
├── scripts/migrar.js            aplica las migraciones pendientes
├── scripts/respaldo.js          copia completa de la base con mysqldump
└── public/                      frontend
    ├── css/estilos.css
    ├── js/                      api.js (compartido) + un script por página
    └── login, registro, catalogo, mis-prestamos,
        admin-libros, admin-prestamos, admin-usuarios (.html)
```

## Flujo de un préstamo

`pendiente` (usuario solicita, se genera el código con crypto) → `prestado` (admin aprueba) → `devuelto` (admin registra devolución).

En `libros`, `cantidad` es el total de ejemplares. Los disponibles se calculan
como `cantidad` menos los préstamos en estado `prestado`, y la API los devuelve
en el campo `disponibles`. Aprobar un préstamo y editar un libro bloquean la
fila del libro, así dos operaciones simultáneas no pueden prestar más
ejemplares de los que existen.

## API

| Método | Ruta | Quién |
|---|---|---|
| POST | /auth/register, /auth/login | Público |
| GET | /auth/yo (datos y rol actuales de la sesión) | Con sesión |
| GET / PUT / DELETE | /usuarios, /usuarios/:id | Admin |
| GET | /libros (`?titulo=`) | Con sesión |
| POST / PUT / DELETE | /libros, /libros/:id | Admin |
| POST | /prestamos | Usuario |
| GET | /prestamos | Admin: todos · Usuario: los suyos |
| PUT | /prestamos/:id/aprobar, /prestamos/:id/devolver | Admin |

Los errores siempre responden `{ "mensaje": "..." }`. Los controladores no
capturan errores: lanzan `ErrorNegocio(status, mensaje)` y el manejador central
de `middlewares/errores.js` arma la respuesta. Los errores inesperados responden
500 sin detalles y quedan registrados con el método y la ruta.

Cada ruta valida su cuerpo, sus parámetros y su búsqueda con un esquema de
`validaciones/` antes de llegar al controlador. El esquema normaliza los datos,
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

| Integrante | Archivos |
|---|---|
| Líder + frontend | `public/**` |
| Base de datos + esqueleto | `database/biblioteca.sql`, `models/**`, `config/db.js`, `app.js` |
| Auth y usuarios | `controllers/authController.js`, `controllers/usuarioController.js`, `middlewares/auth.js`, `routes/authRoutes.js`, `routes/usuarioRoutes.js` |
| Libros | `controllers/libroController.js`, `routes/libroRoutes.js` |
| Préstamos | `controllers/prestamoController.js`, `routes/prestamoRoutes.js` |
