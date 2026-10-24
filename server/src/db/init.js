require('dotenv').config();
const store = require('../db');

(async () => {
  await store.inicializar();
  const info = store.infoMotor();
  console.log(`Esquema SQL aplicado. Motor: ${info.motor}`);
  const stats = await store.estadisticasBD();
  console.log(`Calculos guardados: ${stats.total}`);
  process.exit(0);
})();
