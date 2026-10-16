# Diagnóstico de los endpoints

## Crear la tabla al iniciar en Render

`npm start` ahora ejecuta `src/db/init.js` antes de iniciar la API. El SQL usa `CREATE TABLE IF NOT EXISTS productos`: crea la tabla si falta y conserva una tabla existente. Si la inicialización falla, el proceso termina con error y la API no arranca.

En el servicio web de Render, usa `npm start` como **Start Command** y despliega estos cambios. Esto permite ejecutar la creación desde Render con la misma `DATABASE_URL` interna. Una vez iniciado, `GET /api/productos` debe responder 200 con una lista (vacía si aún no hay productos), siempre que la conexión, permisos y esquema sean correctos.

Se intentó ejecutar `npm run db:init` desde esta PC y falló con `ENOTFOUND` antes de ejecutar SQL. No se ha confirmado la creación de la tabla remota ni se ha realizado un despliegue desde este entorno.

La causa del error 500 del despliegue todavía no está confirmada. La conexión local a PostgreSQL falla con `ENOTFOUND` porque el host configurado es interno de Render; esto no prueba que esa conexión falle dentro de Render. Se mantiene `DATABASE_URL` sin cambios. La ruta `/` no consulta la base; que responda correctamente no demuestra que el CRUD funcione.

## Comprobación opcional desde tu PC

Estos pasos solo aplican si quieres conectar desde tu PC. No son una corrección demostrada del error 500 del despliegue ni requieren cambiar la URL interna del servicio de Render.

1. En el panel de la base PostgreSQL de Render, copia **External Database URL** para usar desde tu PC. No compartas esa URL: contiene contraseña.
2. Reemplaza `DATABASE_URL` en `.env` y configura `DB_SSL=true` para la conexión externa de Render. La configuración actual permite SSL sin verificar el certificado; revisa la configuración de certificados antes de usarla para información sensible.
3. Desde esta carpeta, ejecuta `npm run db:check`. Comprueba conexión, columnas y permiso de lectura sin modificar datos.
4. Si la tabla no existe, ejecuta `npm run db:init` y repite la comprobación. El inicializador crea la tabla; no migra tablas existentes con columnas diferentes.
5. Ejecuta `npm start`. En Postman cambia `baseUrl` a `http://localhost:3000` para probar los cambios locales.

En Render configura las variables del servicio por separado: el `.env` de tu PC no actualiza el despliegue. La URL interna requiere que el servicio y la base puedan conectarse por la red privada de Render. Los cambios locales necesitan un nuevo despliegue para afectar a la URL pública.

## Correcciones realizadas

- Se rechazan con 400 los identificadores y valores fuera de los límites de PostgreSQL, evitando errores 500 por desbordamiento.
- Se implementó el filtro `GET /api/productos?nombre=...` incluido en Postman, con consulta parametrizada.
- Si un producto desaparece durante una actualización se devuelve 404.
- La conexión tiene límite de espera y un manejador para errores de clientes inactivos.
- El inicializador devuelve un código de salida de fallo si no puede crear la tabla.
- La carga de `.env` funciona independientemente de la carpeta desde donde se inicia la aplicación.

## Verificación y límites

`npm test` verifica respuestas HTTP y validación usando una base simulada, sin escribir en la base del docente. No sustituye una prueba con PostgreSQL real. `npm run db:check` comprueba la conexión real; hasta que pase, no se puede dar por verificado el CRUD completo.

La colección usa la URL pública por defecto y un identificador que podría no existir. Primero crea un producto para que Postman guarde su identificador. Un 404 al buscar un producto inexistente es esperado.

En una segunda consulta con acceso de red, tanto `GET https://backendupbtest.onrender.com/` como `GET https://backendupbtest.onrender.com/api/productos` respondieron `404 Not Found` en texto, diferente del JSON 404 de esta aplicación. Esto no reproduce el 500 reportado y no permite confirmar que esa URL esté sirviendo este código. Para identificar la causa se necesitan la petición exacta que falla y los registros del servicio.

## Fallos concretos del código original

- Un `id` como `2147483648` superaba la validación, pero excede el tipo INTEGER usado por la tabla. En una consulta a esa tabla puede producir el error PostgreSQL `22003`, que el manejador convierte en 500.
- Un `stock` como `2147483648` o un `precio` como `100000000` también superaban la validación y exceden los tipos declarados en `schema.sql`.
- Si se elimina un producto entre la lectura y el UPDATE, el repositorio devuelve null. El DTO de respuesta original accedía a `producto.id`, generando TypeError y 500. Ahora el servicio responde 404.

Estos son defectos corregidos y escenarios específicos; no se atribuye a ninguno el incidente del docente sin reproducir su petición.
