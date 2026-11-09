# Sistema Web de Gestión de Biblioteca

Node.js + Express + Sequelize + MySQL + bcrypt + JWT + crypto. Frontend en HTML/CSS/JS puro servido por Express.

## Cómo ejecutarlo

1. Instalar dependencias: `npm install`
2. Crear la base de datos (pide la contraseña de tu MySQL): `mysql -u root -p < database/biblioteca.sql`
3. Copiar `.env.example` a `.env` y completar `DB_PASS` (y cambiar `JWT_SECRET`).
4. Crear el administrador (ver abajo).
5. Iniciar: `npm start`  (o `npm run dev` para reiniciar solo al guardar)
6. Abrir http://localhost:3000

Los usuarios normales se crean desde la página de registro.

## Crear o cambiar el administrador

El script SQL no crea cuentas. El administrador se crea con un comando que lee
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
├── scripts/crear-admin.js       crea o actualiza el administrador
└── public/                      frontend
    ├── css/estilos.css
    ├── js/                      api.js (compartido) + un script por página
    └── login, registro, catalogo, mis-prestamos,
        admin-libros, admin-prestamos, admin-usuarios (.html)
```

## Flujo de un préstamo

`pendiente` (usuario solicita, se genera el código con crypto) → `prestado` (admin aprueba, stock −1) → `devuelto` (admin registra devolución, stock +1).

## API

| Método | Ruta | Quién |
|---|---|---|
| POST | /auth/register, /auth/login | Público |
| GET / PUT / DELETE | /usuarios, /usuarios/:id | Admin |
| GET | /libros (`?titulo=`) | Con sesión |
| POST / PUT / DELETE | /libros, /libros/:id | Admin |
| POST | /prestamos | Usuario |
| GET | /prestamos | Admin: todos · Usuario: los suyos |
| PUT | /prestamos/:id/aprobar, /prestamos/:id/devolver | Admin |

Los errores siempre responden `{ "mensaje": "..." }`.

## Qué archivos toca cada integrante

| Integrante | Archivos |
|---|---|
| Líder + frontend | `public/**` |
| Base de datos + esqueleto | `database/biblioteca.sql`, `models/**`, `config/db.js`, `app.js` |
| Auth y usuarios | `controllers/authController.js`, `controllers/usuarioController.js`, `middlewares/auth.js`, `routes/authRoutes.js`, `routes/usuarioRoutes.js` |
| Libros | `controllers/libroController.js`, `routes/libroRoutes.js` |
| Préstamos | `controllers/prestamoController.js`, `routes/prestamoRoutes.js` |
