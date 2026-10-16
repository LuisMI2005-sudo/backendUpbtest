const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const pool = require('../src/config/db');
const app = require('../src/app');
const server = app.listen(0, '127.0.0.1');
const ready = new Promise(resolve => server.once('listening', resolve));
let calls = [];
let rows = [];
pool.query = async (...args) => { calls.push(args); return { rows, rowCount: rows.length }; };

async function request(path, method = 'GET', body) {
    await ready;
    return fetch(`http://127.0.0.1:${server.address().port}${path}`, {
        method, headers: { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
}

test('La API valida las entradas y respeta el contrato CRUD', async () => {
    assert.equal((await request('/')).status, 200);
    assert.equal((await request('/no-existe')).status, 404);
    for (const id of ['abc', '0', '-1', '2147483648', '9007199254740993', '1e2']) {
        for (const method of ['GET', 'PUT', 'DELETE']) {
            calls = [];
            assert.equal((await request(`/api/productos/${id}`, method, method === 'PUT' ? { precio: 1 } : undefined)).status, 400);
            assert.equal(calls.length, 0);
        }
    }
    for (const body of [{}, { nombre: ' ' }, { nombre: 'x', precio: 1e100 }, { nombre: 'x', stock: 2147483648 }, { nombre: 'x', precio: -1 }]) {
        calls = [];
        assert.equal((await request('/api/productos', 'POST', body)).status, 400);
        assert.equal(calls.length, 0);
    }
    assert.equal((await request('/api/productos/1', 'PUT', {})).status, 400);
    assert.equal((await request('/api/productos/1')).status, 404);
    assert.equal((await request('/api/productos/1', 'DELETE')).status, 404);
    rows = [{ id: 1, nombre: 'Laptop', precio: '1500.00', stock: 5, created_at: '2026-10-16' }];
    const created = await request('/api/productos', 'POST', { nombre: 'Laptop', precio: 1500, stock: 5 });
    assert.equal(created.status, 201);
    assert.equal((await created.json()).precio, 1500);
    assert.equal((await request('/api/productos/1', 'PUT', { stock: 10 })).status, 200);
    assert.deepEqual(calls.at(-1)[1], ['Laptop', 1500, 10, 1]);
    await request('/api/productos?nombre=Lap');
    assert.match(calls.at(-1)[0], /WHERE/);
    assert.deepEqual(calls.at(-1)[1], ['Lap']);
    assert.equal((await request('/api/productos?nombre[x]=a&nombre=b&nombre=c')).status, 400);
    assert.equal((await request('/api/productos/1', 'DELETE')).status, 204);
});

after(async () => {
    await new Promise(resolve => server.close(resolve));
    await pool.end();
});
