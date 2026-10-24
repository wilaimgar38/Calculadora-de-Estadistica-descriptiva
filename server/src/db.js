require('dotenv').config();
const sqlite = require('./database/sqlite');
const mysql = require('./database/mysql');

let impl = sqlite;
let motor = 'sqlite';
let errorMySQL = null;

async function inicializar() {
  const driver = (process.env.DB_DRIVER || 'sqlite').toLowerCase();
  if (driver === 'mysql') {
    try {
      await mysql.conectar({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'estadistica_curso',
      });
      impl = mysql;
      motor = 'mysql';
      console.log(`Base de datos SQL: MySQL (${process.env.DB_NAME || 'estadistica_curso'})`);
      return;
    } catch (err) {
      errorMySQL = err.message;
      console.warn(`No se pudo conectar a MySQL (${err.message}). Se usara SQLite como respaldo.`);
    }
  }
  impl = sqlite;
  motor = 'sqlite';
  console.log(`Base de datos SQL: SQLite (${sqlite.info.archivo})`);
}

const guardarCalculo = (datos) => impl.guardarCalculo(datos);
const listarCalculos = (filtros) => impl.listarCalculos(filtros);
const eliminarCalculo = (id) => impl.eliminarCalculo(id);
const limpiarHistorial = () => impl.limpiarHistorial();
const estadisticasBD = () => impl.estadisticasBD();
const guardarConjunto = (datos) => impl.guardarConjunto(datos);
const listarConjuntos = () => impl.listarConjuntos();
const eliminarConjunto = (id) => impl.eliminarConjunto(id);

function infoMotor() {
  const info = typeof impl.info === 'function' ? impl.info() : impl.info;
  return { ...info, driver: motor, errorMySQL };
}

module.exports = {
  inicializar,
  guardarCalculo,
  listarCalculos,
  eliminarCalculo,
  limpiarHistorial,
  estadisticasBD,
  guardarConjunto,
  listarConjuntos,
  eliminarConjunto,
  infoMotor,
  esMySQL: () => motor === 'mysql',
  drivers: { sqlite, mysql },
};
