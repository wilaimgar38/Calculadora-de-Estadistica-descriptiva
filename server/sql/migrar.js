// Migra los datos de SQLite a MySQL: node sql/migrar.js
require('dotenv').config({ path: require('node:path').join(__dirname, '..', '.env') });

const sqlite = require('../src/database/sqlite');
const mysql = require('../src/database/mysql');

async function main() {
  await mysql.conectar({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'estadistica_curso',
  });

  const pool = await mysql.obtenerPool();
  const datos = sqlite.leerFilasParaMigracion();

  const [existentes] = await pool.query(`SELECT COUNT(*) AS total FROM calculos`);
  const yaHay = Number(existentes[0].total);
  if (yaHay > 0) console.log(`MySQL ya tiene ${yaHay} calculos: se omiten duplicados por (tipo, titulo, creado_en).`);

  let insertados = 0;
  for (const f of datos.calculos) {
    const [dup] = await pool.query(
      `SELECT COUNT(*) AS c FROM calculos WHERE tipo = ? AND titulo = ? AND creado_en = ?`,
      [f.tipo, f.titulo, f.creado_en],
    );
    if (Number(dup[0].c) > 0) continue;
    await mysql.guardarCalculo({
      tipo: f.tipo,
      categoria: f.categoria,
      titulo: f.titulo,
      entrada: JSON.parse(f.entrada),
      resultado: JSON.parse(f.resultado),
      exito: f.exito,
      creadoEn: f.creado_en,
    });
    insertados++;
  }

  let conjuntos = 0;
  for (const c of datos.conjuntos) {
    await mysql.guardarConjunto({ nombre: c.nombre, descripcion: c.descripcion, datos: JSON.parse(c.datos) });
    conjuntos++;
  }

  const stats = await mysql.estadisticasBD();
  console.log(`Migracion lista: ${insertados} calculos y ${conjuntos} conjuntos copiados.`);
  console.log(`MySQL ahora tiene ${stats.total} calculos.`);
  process.exit(0);
}

main().catch((err) => {
  console.error('Error en la migracion:', err.message);
  process.exit(1);
});
