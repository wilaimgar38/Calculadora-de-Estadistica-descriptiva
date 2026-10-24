const express = require('express');
const { calcularDescriptiva } = require('../services/descriptiva');
const { calcularFrecuencias } = require('../services/frecuencias');
const { calcularCombinatoria } = require('../services/combinatoria');
const { calcularProbabilidad } = require('../services/probabilidad');
const store = require('../db');
const { partirTexto, esSerieNumerica } = require('../util/categorias');
const { calcularFrecuenciasCualitativas } = require('../services/frecuenciasCualitativas');
const { analizarProblema, consultar } = require('../services/analizador');
const { analizarDatos } = require('../services/analisisDatos');
const ia = require('../services/ia');
const { resolverConIA, conversarConIA } = require('../services/resolverIA');

const router = express.Router();

async function manejar(res, fn, codigoError = 400) {
  try {
    res.json({ ok: true, ...(await fn()) });
  } catch (err) {
    res.status(codigoError).json({ ok: false, error: err.message });
  }
}

// Guarda en el historial sin que un fallo de la base de datos impida mostrar el resultado
async function guardarSeguro(registro) {
  try {
    return await store.guardarCalculo(registro);
  } catch (err) {
    console.warn('No se pudo guardar en el historial:', err.message);
    return null;
  }
}

router.get('/salud', async (_req, res) => {
  try {
    const info = store.infoMotor();
    res.json({
      ok: true,
      servicio: 'estadistica-probabilidad',
      baseDatos: info.motor === 'MySQL' ? 'MySQL (SQL)' : 'SQLite (SQL)',
      motor: info,
      estadisticas: await store.estadisticasBD(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.post('/calculos/descriptiva', (req, res) =>
  manejar(res, async () => {
    const { data, tipo = 'muestra' } = req.body || {};
    const tokens = partirTexto(data);
    if (!esSerieNumerica(tokens)) {
      const resultado = calcularFrecuenciasCualitativas(tokens);
      const id = await guardarSeguro({
        tipo: 'descriptiva',
        categoria: 'cualitativas',
        titulo: `Descriptiva (categorias) - ${resultado.n} datos`,
        entrada: { datos: tokens, tipo: 'categorias' },
        resultado,
      });
      return { id, datos: tokens, resultado };
    }
    const datos = tokens.map((t) => Number(t.replace(',', '.')));
    const resultado = calcularDescriptiva(datos, tipo === 'poblacion' ? 'poblacion' : 'muestra');
    const id = await guardarSeguro({
      tipo: 'descriptiva',
      categoria: tipo,
      titulo: `Descriptiva (${tipo}) - ${datos.length} datos`,
      entrada: { datos, tipo },
      resultado,
    });
    return { id, datos, resultado };
  }),
);

router.post('/calculos/frecuencias', (req, res) =>
  manejar(res, async () => {
    const { data, numClases, tipo = 'muestra' } = req.body || {};
    const tokens = partirTexto(data);
    if (!esSerieNumerica(tokens)) {
      const resultado = calcularFrecuenciasCualitativas(tokens);
      const id = await guardarSeguro({
        tipo: 'frecuencias',
        categoria: 'cualitativas',
        titulo: `Frecuencias (categorias) - ${resultado.numCategorias} categorias`,
        entrada: { datos: tokens, modo: 'cualitativas' },
        resultado,
      });
      return { id, resultado };
    }
    const datos = tokens.map((t) => Number(t.replace(',', '.')));
    const k =
      numClases === undefined || numClases === '' || numClases === null ? undefined : Number(numClases);
    const resultado = calcularFrecuencias(datos, k, tipo);
    const id = await guardarSeguro({
      tipo: 'frecuencias',
      categoria: 'agrupados',
      titulo: `Tabla de frecuencias - ${resultado.numClases} clases`,
      entrada: { datos, numClases: k ?? 'Sturges' },
      resultado,
    });
    return { id, resultado };
  }),
);

router.post('/calculos/datos', (req, res) =>
  manejar(res, async () => {
    const { data, tipo = 'muestra', numClases } = req.body || {};
    const resultado = analizarDatos(data, { tipo, numClases });
    const r = resultado.modo === 'cualitativas' ? resultado.frecuencias : resultado.descriptiva;
    const id = await guardarSeguro({
      tipo: resultado.modo === 'cualitativas' ? 'frecuencias' : 'descriptiva',
      categoria: resultado.modo === 'cualitativas' ? 'cualitativas' : resultado.tipo,
      titulo:
        resultado.modo === 'cualitativas'
          ? `Datos cualitativos - ${r.n} datos, ${r.numCategorias} categorias`
          : `Analisis de datos (${resultado.tipo}) - ${r.n} datos`,
      entrada: { datos: resultado.datos, tipo, numClases: numClases || 'Sturges' },
      resultado: resultado.modo === 'cualitativas'
        ? { modo: 'cualitativas', n: r.n, moda: r.moda, tabla: r.tabla }
        : { media: r.media, mediana: r.mediana, modas: r.modas, varianza: r.varianza, desviacionEstandar: r.desviacionEstandar, n: r.n, rango: r.rango, q1: r.q1, q3: r.q3 },
    });
    return { id, resultado };
  }),
);

router.post('/calculos/combinatoria', (req, res) =>
  manejar(res, async () => {
    const resultado = calcularCombinatoria(req.body || {});
    const id = await guardarSeguro({
      tipo: 'combinatoria',
      categoria: resultado.tipo,
      titulo: `${resultado.nombre}: ${resultado.valorExacto}`,
      entrada: { tipo: resultado.tipo, n: resultado.n, r: resultado.r },
      resultado,
    });
    return { id, resultado };
  }),
);

router.post('/calculos/probabilidad', (req, res) =>
  manejar(res, async () => {
    const cuerpo = req.body || {};
    const resultado = calcularProbabilidad(cuerpo);
    const id = await guardarSeguro({
      tipo: 'probabilidad',
      categoria: cuerpo.tipo || 'probabilidad',
      titulo: resultado.nombre || 'Probabilidad',
      entrada: cuerpo,
      resultado,
    });
    return { id, resultado };
  }),
);

function adjuntarAnalisisLocal(analisis) {
  // el analizador local devuelve los datos; se agrega el analisis completo para tablas y graficas
  if (analisis.falta || !analisis.datosDetectados?.length) return analisis;
  if (analisis.vista !== 'descriptiva' && analisis.vista !== 'frecuencias') return { ...analisis, vista: 'operaciones' };
  try {
    return { ...analisis, analisisDatos: analizarDatos(analisis.datosDetectados), vista: 'datos' };
  } catch {
    return analisis;
  }
}

router.post('/analizar', (req, res) =>
  manejar(res, async () => {
    const { texto, motor = 'auto' } = req.body || {};
    if (!texto || !String(texto).trim()) throw new Error('Escribe el enunciado del problema.');
    let analisis = null;
    let aviso = null;
    const usarIA = motor === 'ia' || (motor === 'auto' && ia.estado().disponible);

    if (usarIA) {
      try {
        analisis = await resolverConIA(String(texto));
      } catch (err) {
        if (motor === 'ia') throw err;
        aviso = `La IA en linea no respondio (${err.message}). Se uso el analizador local.`;
      }
    }
    if (!analisis) {
      const local = analizarProblema(texto);
      // el analizador local guarda todos los numeros (no solo 25) para el analisis completo
      analisis = adjuntarAnalisisLocal({ ...local, motor: 'local' });
    }
    analisis.aviso = aviso;

    if (!analisis.falta) {
      const id = await guardarSeguro({
        tipo: 'analizador',
        categoria: analisis.tema || analisis.tipo || 'problema',
        titulo: `Problema resuelto (${analisis.motor === 'ia' ? 'IA' : 'local'}) - ${analisis.pregunta && typeof analisis.pregunta === 'string' && analisis.pregunta.length > 12 ? analisis.pregunta.slice(0, 120) : analisis.tema || analisis.tipo || ''}`.trim(),
        entrada: { texto: String(texto).slice(0, 2000), motor: analisis.motor },
        resultado: {
          respuesta: analisis.respuesta,
          conclusion: analisis.conclusion,
          pasos: analisis.pasos,
          conceptos: analisis.conceptos,
          datos: (analisis.datosDetectados || []).slice(0, 100),
        },
      });
      return { id, analisis };
    }
    return { analisis };
  }),
);

router.post('/analizar/consulta', (req, res) =>
  manejar(res, async () => {
    const { pregunta, contexto, historial, motor = 'auto' } = req.body || {};
    if (!pregunta || !String(pregunta).trim()) throw new Error('Escribe tu pregunta.');
    if ((motor === 'ia' || motor === 'auto') && ia.estado().disponible) {
      try {
        return await conversarConIA(String(pregunta), contexto || {}, historial || []);
      } catch (err) {
        if (motor === 'ia') throw err;
        const local = consultar(String(pregunta), contexto);
        return { ...local, motor: 'local', aviso: `IA no disponible (${err.message}).` };
      }
    }
    return { ...consultar(String(pregunta), contexto), motor: 'local' };
  }),
);

router.get('/ia/estado', (_req, res) => res.json({ ok: true, ...ia.estado() }));

router.post('/ia/config', (req, res) =>
  manejar(res, async () => {
    const { proveedor, apiKey, modelo, activa } = req.body || {};
    return ia.guardarConfig({ proveedor, apiKey, modelo, activa });
  }),
);

router.post('/ia/probar', (_req, res) => manejar(res, async () => ia.probar()));

router.get('/historial', async (req, res) => {
  try {
    const { tipo, limite } = req.query;
    res.json({
      ok: true,
      datos: await store.listarCalculos({ tipo, limite }),
      estadisticas: await store.estadisticasBD(),
    });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

router.delete('/historial/:id', (req, res) =>
  manejar(res, async () => {
    const borrado = await store.eliminarCalculo(req.params.id);
    if (!borrado) throw new Error('No se encontro el calculo.');
    return { mensaje: 'Calculo eliminado.' };
  }, 500),
);

router.delete('/historial', (_req, res) =>
  manejar(res, async () => ({ borrados: await store.limpiarHistorial() }), 500),
);

router.get('/conjuntos', (_req, res) => manejar(res, async () => ({ datos: await store.listarConjuntos() }), 500));

router.post('/conjuntos', (req, res) =>
  manejar(res, async () => {
    const { nombre, descripcion, data } = req.body || {};
    if (!nombre || !String(nombre).trim()) throw new Error('El conjunto debe tener un nombre.');
    const datos = partirTexto(data);
    await store.guardarConjunto({ nombre: String(nombre).trim(), descripcion: descripcion || '', datos });
    return { nombre, n: datos.length };
  }),
);

router.delete('/conjuntos/:id', (req, res) =>
  manejar(res, async () => {
    const borrado = await store.eliminarConjunto(req.params.id);
    if (!borrado) throw new Error('No se encontro el conjunto.');
    return { mensaje: 'Conjunto eliminado.' };
  }, 500),
);

router.get('/ejemplos', (_req, res) => {
  res.json({
    ok: true,
    datos: [
      { nombre: 'Notas del curso', data: '72, 85, 91, 68, 78, 95, 88, 74, 69, 83, 90, 77' },
      { nombre: 'Muestra pequena', data: '4, 8, 6, 5, 3, 5, 6, 2' },
      { nombre: 'Datos con decimal', data: '12.5, 14.2, 11.8, 15.6, 13.9, 12.1, 14.8' },
      { nombre: 'Edades', data: '18, 21, 22, 19, 25, 30, 35, 28, 22, 21, 19, 40' },
      { nombre: 'Colores (cualitativos)', data: 'Azul, Negro, Marrón, Verde, Azul, Negro, Azul, Marrón, Negro, Negro' },
    ],
  });
});

router.get('/ejemplos-problemas', (_req, res) => {
  res.json({
    ok: true,
    datos: [
      {
        nombre: 'Media y desviación',
        texto:
          'En un curso de estadística los estudiantes obtuvieron las siguientes calificaciones: 72, 85, 91, 68, 78, 95, 88, 74, 69, 83, 90, 77. ¿Cuál es la media y la desviación estándar?',
      },
      {
        nombre: 'Frecuencias cualitativas',
        texto: 'Colores observados en 10 autos: Azul, Negro, Marrón, Verde, Azul, Negro, Azul, Marrón, Negro, Negro. ¿Cuál es la moda?',
      },
      {
        nombre: 'Combinatoria',
        texto: 'De 10 estudiantes se deben elegir 3 para un comité, sin importar el orden. ¿De cuántas formas se puede hacer?',
      },
      {
        nombre: 'Probabilidad (unión)',
        texto: 'Si P(A) = 0.3, P(B) = 0.4 y P(A y B) = 0.12, ¿cuál es la probabilidad de A unión B?',
      },
      {
        nombre: 'Probabilidad condicional',
        texto: 'Si P(A y B) = 0.12 y P(B) = 0.4, ¿cuánto es la probabilidad de A dado que ocurrió B?',
      },
      {
        nombre: 'Teorema de Bayes',
        texto:
          'En una planta el 1% de los productos está defectuoso (H1) y el 99% es bueno (H2). Un detector marca defectuoso con probabilidad 0.9 si está defectuoso y 0.2 si está bueno. Si el detector marca defectuoso, ¿qué probabilidad tiene de estar realmente defectuoso? P(H1) = 0.01, P(H2) = 0.99, P(E|H1) = 0.9, P(E|H2) = 0.2',
      },
      {
        nombre: 'Urna sin reemplazo (IA)',
        texto: 'Una urna contiene 5 bolas rojas y 3 azules. Se extraen 2 bolas sin reemplazo. ¿Cuál es la probabilidad de que ambas sean rojas? ¿Y de que salga al menos una azul?',
      },
      {
        nombre: 'Binomial (IA)',
        texto: 'El 20% de los artículos de una fábrica salen defectuosos. Si se eligen 10 artículos al azar, ¿cuál es la probabilidad de que exactamente 3 sean defectuosos? ¿Y de que haya como máximo 2?',
      },
      {
        nombre: 'Distribución normal (IA)',
        texto: 'Las estaturas de un grupo de estudiantes siguen una distribución normal con media 165 cm y desviación estándar 8 cm. ¿Qué porcentaje de estudiantes mide entre 157 y 181 cm?',
      },
      {
        nombre: 'Tabla agrupada dada (IA)',
        texto: 'Se registraron los salarios semanales (en quetzales) de 50 empleados: de 500 a 600 hay 8, de 600 a 700 hay 12, de 700 a 800 hay 15, de 800 a 900 hay 10 y de 900 a 1000 hay 5. Calcule la media, la mediana y la moda.',
      },
      {
        nombre: 'Tabla de frecuencias',
        texto: 'Los pesos (kg) de 20 trabajadores son los siguientes. Construya la tabla de frecuencias y calcule la media y la mediana agrupadas: 55, 62, 70, 58, 66, 72, 60, 65, 59, 68, 74, 61, 67, 63, 71, 69, 57, 64, 73, 66',
      },
    ],
  });
});

module.exports = router;
