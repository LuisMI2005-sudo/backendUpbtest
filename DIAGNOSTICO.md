# Diagnóstico y verificación en Render

El proyecto usa `DATABASE_URL` del archivo `.env` cuando se ejecuta fuera de Render y la variable del servicio cuando se despliega. La URL interna original se conserva; no se necesita una conexión local para usar esta API desde Postman.

## Despliegue comprobado

- Servicio: backendUpbtest, dentro de CertiIA / Production, en Oregon.
- URL pública: https://backendupbtest-969u.onrender.com
- Repositorio: LuisMI2005-sudo/backendUpbtest, rama main.
- Build Command: `npm install`.
- Start Command: `npm start`.
- Plan gratuito.
- El registro de Render confirmó la creación de la tabla `productos` y el despliegue activo del commit 6491b6b.

`npm start` crea la tabla si no existe antes de iniciar Express. No elimina registros ni migra tablas existentes. Si falla la creación, el arranque termina con error.

El hostname interno de PostgreSQL solo se puede resolver desde la red de Render. Ejecutar ese arranque en tu PC con la URL interna produce ENOTFOUND; para este flujo las peticiones se envían directamente a la URL pública de Render.

## Correcciones del código

- Validación de id, precio y stock dentro de los límites declarados por PostgreSQL para evitar desbordamientos que acababan en 500.
- Filtro de búsqueda por nombre mediante consulta parametrizada, sin distinguir mayúsculas.
- Respuesta 404 cuando el producto desaparece durante una actualización, evitando acceder a propiedades de null.
- Límite de espera de conexión y manejo de desconexiones de clientes inactivos.
- Código de salida de fallo si no se puede inicializar la tabla.
- Carga de `.env` relativa al proyecto.
- Eliminación de nodemon y sus dependencias de desarrollo con alertas de seguridad; `npm run dev` usa la recarga integrada de Node.

Tras este ajuste, `npm test` pasó y `npm audit` informó cero vulnerabilidades en las dependencias instaladas.

## Pruebas con PostgreSQL real

El 16 de octubre de 2026 se ejecutaron 17 comprobaciones contra la API desplegada. Todas pasaron, incluida la persistencia de una actualización y la búsqueda por nombre. Se creó un único producto temporal con autorización del usuario y se eliminó al finalizar; la consulta posterior confirmó 404.

| Operación | Resultado esperado y recibido |
| --- | --- |
| Inicio, listar, obtener, buscar y actualizar | 200 |
| Crear producto válido | 201 |
| Eliminar el producto de prueba | 204 |
| Datos inválidos o valores fuera de rango | 400 |
| Producto eliminado o ruta inexistente | 404 |

El detalle está en `verificacion-render.json`. El script `npm run verify:render` repite la prueba contra la dirección de la colección: crea, actualiza y elimina un producto temporal, por lo que se debe ejecutar solo con autorización para modificar la base real. `npm test` usa una base simulada y no modifica datos de Render.

## Postman

Importa `Postman/backendUpb.postman_collection.json`. Su variable `baseUrl` ya contiene la dirección correcta de Render. La URL anterior sin el sufijo `-969u` devolvía 404 y no corresponde a este despliegue.

Ejecuta la colección en orden. Crear producto guarda automáticamente su id para las peticiones siguientes. El caso inválido devuelve 400 y Eliminar devuelve 204; esos códigos indican el comportamiento esperado. Un entorno de Postman con otra variable `baseUrl` puede sobrescribir el valor de la colección: corrígela o usa la URL completa.

La creación de la tabla y las pruebas actuales están confirmadas. No se dispone del registro original del error 500 del docente, por lo que no se atribuye retrospectivamente una causa única a ese incidente.
