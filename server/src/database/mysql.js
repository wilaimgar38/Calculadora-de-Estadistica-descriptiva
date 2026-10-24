const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');

const SCHEMA_PATH = path.join(__dirname, '..', '..', 'sql', 'schema.mysql.sql');

let pool = null;
let base = '';

function json(valor) {
  if (valor === null || valor === undefined) return valor;
  if (typeof valor === 'string') {
    try {
      return JSON.parse(valor);
    } catch {
      return valor;
    }
  }
  return valor;
}

async function conectar({ host, port, user, password, database }) {
  const conexion = await mysql.createConnection({
    host,
    port: Number(port) || 3306,
    user,
    password,
    connectTimeout: 8000,
  });
  await conexion.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conexion.end();

  base = database;
  pool = mysql.createPool({
    host,
    port: Number(port) || 3306,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    charset: 'utf8mb4_unicode_ci',
  });

  const esquema = fs.readFileSync(SCHEMA_PATH, 'utf8')
    .replace(/CREATE DATABASE[\s\S]*?;\s*/i, '')
    .replace(/USE\s+\w+;\s*/i, '');
  for (const sentencia of esquema.split(';').map((s) => s.trim()).filter(Boolean)) {
    await pool.query(sentencia);
  }
  return true;
}

async function guardarCalculo({ tipo, categoria, titulo, entrada, resultado, exito = 1, creadoEn }) {
  const [res] = creadoEn
    ? await pool.query(
        `INSERT INTO calculos (tipo, categoria, titulo, entrada, resultado, exito, creado_en) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [tipo, categoria, titulo, JSON.stringify(entrada), JSON.stringify(resultado), exito ? 1 : 0, creadoEn],
      )
    : await pool.query(
        `INSERT INTO calculos (tipo, categoria, titulo, entrada, resultado, exito) VALUES (?, ?, ?, ?, ?, ?)`,
        [tipo, categoria, titulo, JSON.stringify(entrada), JSON.stringify(resultado), exito ? 1 : 0],
      );
  return res.insertId;
}

async function listarCalculos({ tipo, limite = 50 } = {}) {
  const limiteSeguro = Math.min(Math.max(Number(limite) || 50, 1), 500);
  const [filas] = tipo
    ? await pool.query(`SELECT * FROM calculos WHERE tipo = ? ORDER BY id DESC LIMIT ?`, [tipo, limiteSeguro])
    : await pool.query(`SELECT * FROM calculos ORDER BY id DESC LIMIT ?`, [limiteSeguro]);
  return filas.map((f) => ({
    id: f.id,
    tipo: f.tipo,
    categoria: f.categoria,
    titulo: f.titulo,
    entrada: json(f.entrada),
    resultado: json(f.resultado),
    exito: Number(f.exito) === 1,
    creadoEn: toLocal(f.creado_en),
  }));
}

function toLocal(fecha) {
  if (!fecha) return null;
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return String(fecha);
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

async function eliminarCalculo(id) {
  const [res] = await pool.query(`DELETE FROM calculos WHERE id = ?`, [Number(id)]);
  return res.affectedRows > 0;
}

async function limpiarHistorial() {
  const [res] = await pool.query(`DELETE FROM calculos`);
  return res.affectedRows;
}

async function estadisticasBD() {
  const [tot] = await pool.query(`SELECT COUNT(*) AS total FROM calculos`);
  const [porTipo] = await pool.query(
    `SELECT tipo, COUNT(*) AS cantidad FROM calculos GROUP BY tipo ORDER BY cantidad DESC`,
  );
  return {
    total: Number(tot[0].total),
    porTipo: porTipo.map((f) => ({ tipo: f.tipo, cantidad: Number(f.cantidad) })),
  };
}

async function guardarConjunto({ nombre, descripcion = '', datos }) {
  await pool.query(
    `INSERT INTO conjuntos_datos (nombre, descripcion, datos) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE descripcion = VALUES(descripcion), datos = VALUES(datos)`,
    [nombre, descripcion, JSON.stringify(datos)],
  );
  return nombre;
}

async function listarConjuntos() {
  const [filas] = await pool.query(`SELECT * FROM conjuntos_datos ORDER BY id DESC`);
  return filas.map((f) => ({
    id: f.id,
    nombre: f.nombre,
    descripcion: f.descripcion,
    datos: json(f.datos),
    creadoEn: toLocal(f.creado_en),
  }));
}

async function eliminarConjunto(id) {
  const [res] = await pool.query(`DELETE FROM conjuntos_datos WHERE id = ?`, [Number(id)]);
  return res.affectedRows > 0;
}

async function obtenerPool() {
  return pool;
}

module.exports = {
  conectar,
  guardarCalculo,
  listarCalculos,
  eliminarCalculo,
  limpiarHistorial,
  estadisticasBD,
  guardarConjunto,
  listarConjuntos,
  eliminarConjunto,
  obtenerPool,
  info: () => ({ motor: 'MySQL', base, host: process.env.DB_HOST || 'localhost' }),
};
