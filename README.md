# Sistema Web de Gestión de Biblioteca

Node.js + Express + Sequelize + MySQL + bcrypt + JWT + crypto. Frontend en HTML/CSS/JS puro servido por Express.

## Cómo ejecutarlo

1. Instalar dependencias: `npm install`
2. Crear la base de datos (pide la contraseña de tu MySQL): `mysql -u root -p < database/biblioteca.sql`
3. Copiar `.env.example` a `.env` y completar `DB_PASS` (y cambiar `JWT_SECRET`).
4. Iniciar: `npm start`  (o `npm run dev` para reiniciar solo al guardar)
5. Abrir http://localhost:3000

Cuentas de prueba (creadas por el script SQL):

| Rol | Email | Contraseña |
|---|---|---|
| Administrador | admin@biblioteca.com | Admin123 |
| Usuario | usuario@biblioteca.com | Usuario123 |

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
├── database/biblioteca.sql      script de la base de datos + datos iniciales
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
