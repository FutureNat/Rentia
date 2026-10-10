# Rentia

Código de la aplicación Rentia: ventas, rentabilidad, productos, publicidad e informes para e-commerce.

## Tecnología

- React y TypeScript, con estructura de Next.js y compilación mediante Vinext.
- Cloudflare Workers para el servidor y Cloudflare D1 para la base de datos.
- Clerk para las cuentas y la autenticación.
- Integraciones con Tiendanube, Mercado Libre, Product Ads y Meta Ads.

## Desarrollo

```sh
npm ci
```

Crear un archivo local `.env.local` tomando como referencia `.env.example` y completar las credenciales necesarias. Nunca subir ese archivo al repositorio.

```sh
npm run dev
npm run build
```

La aplicación necesita los bindings de Cloudflare y una base D1 con las migraciones de `drizzle/`. El código actual no es un servidor Node.js autónomo: subirlo a GitHub no configura el alojamiento ni copia la base de datos de producción.

## Carpetas

- `app/`: páginas, estilos y API.
- `components/`: interfaz de usuario.
- `lib/`: lógica de negocio e integraciones.
- `db/`: acceso a la base de datos.
- `drizzle/`: migraciones SQL.
- `public/`: logos, imágenes y favicon.
- `tests/` y `scripts/`: pruebas y verificaciones.

## Seguridad y alcance de esta copia

Esta copia contiene el código actual, sin el historial anterior de desarrollo. No incluye claves reales, `.env.local`, datos de las tiendas, bases de datos locales, `node_modules`, compilaciones ni archivos de trabajo.

`.openai/hosting.json` identifica el proyecto existente en Sites y sus bindings lógicos; no contiene las credenciales de producción. Los secretos y permisos de las integraciones se configuran en el entorno de alojamiento, no en GitHub.
