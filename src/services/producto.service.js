const productoRepository = require('../repositories/producto.repository');
const HttpError = require('../utils/http-error');

const validarId = (id) => {
    const numero = Number(id);
    if (!/^\d+$/.test(String(id)) || !Number.isInteger(numero) || numero <= 0 || numero > 2147483647) throw new HttpError(400, 'El id debe ser un entero entre 1 y 2147483647');
    return numero;
};

const listar = (nombre) => {
    if (nombre !== undefined && typeof nombre !== 'string') throw new HttpError(400, '"nombre" debe ser un texto');
    return productoRepository.findAll(nombre);
};

const obtenerPorId = async (id) => {
    const producto = await productoRepository.findById(validarId(id));
    if (!producto) throw new HttpError(404, 'Producto no encontrado');
    return producto;
};

const crear = (datos) => productoRepository.create(datos);

// Actualización parcial: los campos que no se envían conservan su valor actual
const actualizar = async (id, datos) => {
    const actual = await obtenerPorId(id);
    const producto = await productoRepository.update(actual.id, {
        nombre: datos.nombre ?? actual.nombre,
        precio: datos.precio ?? actual.precio,
        stock: datos.stock ?? actual.stock,
    });
    if (!producto) throw new HttpError(404, 'Producto no encontrado');
    return producto;
};

const eliminar = async (id) => {
    const eliminado = await productoRepository.remove(validarId(id));
    if (!eliminado) throw new HttpError(404, 'Producto no encontrado');
};

module.exports = { listar, obtenerPorId, crear, actualizar, eliminar };
