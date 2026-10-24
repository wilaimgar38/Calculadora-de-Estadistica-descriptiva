const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const DB_DIR = path.join(__dirname, '..', '..', 'db');
const DB_PATH = process.env.SQLITE_PATH || path.join(DB_DIR, 'estadistica.db');
const SCHEMA_PATH = path.join(__dirname, '..', '..', 'sql', 'schema.sql');

fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new DatabaseSync(DB_PATH);
db.exec(fs.readFileSync(SCHEMA_PATH, 'utf8'));

function guardarCalculo({ tipo, categoria, titulo, entrada, resultado, exito = 1 }) {
  const res = db
    .prepare(
      `INSERT INTO calculos (tipo, categoria, titulo, entrada, resultado, exito)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(tipo, categoria, titulo, JSON.stringify(entrada), JSON.stringify(resultado), exito ? 1 : 0);
  return Number(res.lastInsertRowid);
}

function listarCalculos({ tipo, limite = 50 } = {}) {
  const limiteSeguro = Math.min(Math.max(Number(limite) || 50, 1), 500);
  const filas = tipo
    ? db.prepare(`SELECT * FROM calculos WHERE tipo = ? ORDER BY id DESC LIMIT ?`).all(tipo, limiteSeguro)
    : db.prepare(`SELECT * FROM calculos ORDER BY id DESC LIMIT ?`).all(limiteSeguro);
  return filas.map((f) => ({
    id: f.id,
    tipo: f.tipo,
    categoria: f.categoria,
    titulo: f.titulo,
    entrada: JSON.parse(f.entrada),
    resultado: JSON.parse(f.resultado),
    exito: f.exito === 1,
    creadoEn: f.creado_en,
  }));
}

function eliminarCalculo(id) {
  return db.prepare(`DELETE FROM calculos WHERE id = ?`).run(Number(id)).changes > 0;
}

function limpiarHistorial() {
  return db.prepare(`DELETE FROM calculos`).run().changes;
}

function estadisticasBD() {
  const total = db.prepare(`SELECT COUNT(*) AS total FROM calculos`).get().total;
  const porTipo = db
    .prepare(`SELECT tipo, COUNT(*) AS cantidad FROM calculos GROUP BY tipo ORDER BY cantidad DESC`)
    .all();
  return { total, porTipo };
}

function guardarConjunto({ nombre, descripcion = '', datos }) {
  db.prepare(
    `INSERT INTO conjuntos_datos (nombre, descripcion, datos) VALUES (?, ?, ?)
     ON CONFLICT(nombre) DO UPDATE SET descripcion = excluded.descripcion, datos = excluded.datos`,
  ).run(nombre, descripcion, JSON.stringify(datos));
  return nombre;
}

function listarConjuntos() {
  return db
    .prepare(`SELECT * FROM conjuntos_datos ORDER BY id DESC`)
    .all()
    .map((f) => ({
      id: f.id,
      nombre: f.nombre,
      descripcion: f.descripcion,
      datos: JSON.parse(f.datos),
      creadoEn: f.creado_en,
    }));
}

function eliminarConjunto(id) {
  return db.prepare(`DELETE FROM conjuntos_datos WHERE id = ?`).run(Number(id)).changes > 0;
}

function leerFilasParaMigracion() {
  return {
    calculos: db.prepare(`SELECT * FROM calculos ORDER BY id`).all(),
    conjuntos: db.prepare(`SELECT * FROM conjuntos_datos ORDER BY id`).all(),
  };
}

module.exports = {
  guardarCalculo,
  listarCalculos,
  eliminarCalculo,
  limpiarHistorial,
  estadisticasBD,
  guardarConjunto,
  listarConjuntos,
  eliminarConjunto,
  leerFilasParaMigracion,
  info: { motor: 'SQLite', archivo: DB_PATH },
};
