# Sistema Web de Gestión de Biblioteca

Node.js + Express + Sequelize + MySQL + bcrypt + JWT + crypto. Frontend en HTML/CSS/JS puro servido por Express.

## Cómo ejecutarlo

1. Instalar dependencias: `npm install`
2. Crear la base de datos (pide la contraseña de tu MySQL): `mysql -u root -p < database/biblioteca.sql`
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

## Estructura

```
biblioteca-web/
├── app.js                       servidor Express
├── package.json
├── .env.example                 copiar a .env
├── config/db.js                 conexión Sequelize -> MySQL
├── models/                      Usuario, Libro, Prestamo + relaciones (index.js)
├── middlewares/auth.js          verificarToken, soloAdmin, soloUsuario
├── controllers/                 auth, usuario, libro, prestamo
├── routes/                      auth, usuario, libro, prestamo
├── utils/validar.js
├── database/biblioteca.sql      script de la base de datos + libros de ejemplo
├── database/migraciones/        cambios de la base, se aplican al arrancar
├── database/migrar.js           ejecuta las migraciones pendientes
├── database/seed.js             libros de ejemplo y administrador inicial
├── services/inventario.js       cálculo de ejemplares disponibles
├── scripts/crear-admin.js       crea o actualiza el administrador
├── scripts/migrar.js            aplica las migraciones pendientes
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

Los errores siempre responden `{ "mensaje": "..." }`.

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
