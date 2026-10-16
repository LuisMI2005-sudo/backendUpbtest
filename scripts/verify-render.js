const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { writeFileSync } = require('node:fs');
const path = require('node:path');
const collection = require('../Postman/backendUpb.postman_collection.json');
const baseUrl = collection.variable.find(variable => variable.key === 'baseUrl').value;
const marker = `Diagnostico-${randomUUID()}`;
const checks = [];
let createdId;

async function request(label, route, expected, method = 'GET', body) {
    const response = await fetch(baseUrl + route, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: AbortSignal.timeout(60000),
    });
    const text = await response.text();
    checks.push({ prueba: label, metodo: method, ruta: route, esperado: expected, recibido: response.status });
    console.log(`${label}: ${response.status} (esperado ${expected})`);
    assert.equal(response.status, expected, `${label}: respuesta HTTP inesperada`);
    return response.headers.get('content-type')?.includes('application/json') && text ? JSON.parse(text) : text;
}

async function verify() {
    let failure;
    try {
        await request('Health check', '/', 200);
        assert.ok(Array.isArray(await request('Listar productos', '/api/productos', 200)));
        const product = await request('Crear producto de prueba', '/api/productos', 201, 'POST', { nombre: marker, precio: 10.5, stock: 2 });
        assert.ok(Number.isInteger(product.id), 'El producto debe devolver un id entero');
        createdId = product.id;
        assert.equal(product.nombre, marker);
        assert.equal(product.precio, 10.5);
        assert.equal(product.stock, 2);
        const found = await request('Obtener producto', `/api/productos/${createdId}`, 200);
        assert.equal(found.nombre, marker);
        const updated = await request('Actualizar producto parcialmente', `/api/productos/${createdId}`, 200, 'PUT', { precio: 15.75, stock: 3 });
        assert.equal(updated.nombre, marker, 'La actualización debe conservar el nombre');
        assert.equal(updated.precio, 15.75);
        assert.equal(updated.stock, 3);
        const persisted = await request('Verificar actualización guardada', `/api/productos/${createdId}`, 200);
        assert.equal(persisted.precio, 15.75);
        assert.equal(persisted.stock, 3);
        const matches = await request('Buscar por nombre sin distinguir mayúsculas', `/api/productos?nombre=${encodeURIComponent(marker.toLowerCase())}`, 200);
        assert.ok(matches.some(row => row.id === createdId));
        const empty = await request('Buscar nombre inexistente', `/api/productos?nombre=${encodeURIComponent(marker + '-inexistente')}`, 200);
        assert.deepEqual(empty, [], 'El filtro debe excluir productos que no coinciden');
        await request('Crear producto inválido', '/api/productos', 400, 'POST', { precio: -10 });
        await request('Rechazar precio fuera de rango', '/api/productos', 400, 'POST', { nombre: marker, precio: 100000000 });
        await request('Rechazar stock fuera de rango', '/api/productos', 400, 'POST', { nombre: marker, stock: 2147483648 });
        await request('Rechazar id fuera de rango', '/api/productos/2147483648', 400);
        await request('Rechazar id inválido', '/api/productos/abc', 400);
        await request('Rechazar actualización vacía', `/api/productos/${createdId}`, 400, 'PUT', {});
        const deletedId = createdId;
        await request('Eliminar solo el producto de prueba', `/api/productos/${createdId}`, 204, 'DELETE');
        createdId = undefined;
        await request('Confirmar producto eliminado', `/api/productos/${deletedId}`, 404);
        await request('Ruta inexistente', '/api/ruta-inexistente', 404);
    } catch (err) {
        failure = err;
        console.error('Falló la verificación:', err.message);
        process.exitCode = 1;
    } finally {
        if (createdId !== undefined) {
            try {
                await request('Limpiar producto de prueba tras fallo', `/api/productos/${createdId}`, 204, 'DELETE');
                createdId = undefined;
            } catch (err) {
                console.error(`No se pudo limpiar el producto de prueba ${createdId}:`, err.message);
                process.exitCode = 1;
            }
        }
        writeFileSync(path.join(__dirname, '../verificacion-render.json'), JSON.stringify({
            fecha: new Date().toISOString(), baseUrl, correcto: !failure && createdId === undefined,
            error: failure?.message, productoPendienteDeLimpiar: createdId, pruebas: checks,
        }, null, 2) + '\n');
    }
}

verify();
