require('dotenv').config();
const express = require('express');
const cors = require('cors');
const api = require('./routes/api');
const store = require('./db');

const app = express();
const PUERTO = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));
app.use('/api', api);

app.use((_req, res) => res.status(404).json({ ok: false, error: 'Ruta no encontrada.' }));
app.use((err, _req, res, _next) => res.status(500).json({ ok: false, error: err.message }));

(async () => {
  await store.inicializar();
  app.listen(PUERTO, () => {
    console.log(`API de estadistica y probabilidad escuchando en http://localhost:${PUERTO}`);
  });
})();
