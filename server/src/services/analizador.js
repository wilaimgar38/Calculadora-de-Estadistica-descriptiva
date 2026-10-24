const { normalizar, extraerNumeros, extraerEtiquetas, extraerItems, STOPWORDS } = require('../util/texto');
const { calcularDescriptiva } = require('./descriptiva');
const { calcularFrecuencias } = require('./frecuencias');
const { calcularFrecuenciasCualitativas } = require('./frecuenciasCualitativas');
const { calcularCombinatoria } = require('./combinatoria');
const { calcularProbabilidad } = require('./probabilidad');

const DICCIONARIO = {
  media: ['media', 'promedio', 'media aritmetica', 'media geometrica', 'calcular la media'],
  mediana: ['mediana', 'valor central', 'centro de los datos'],
  moda: ['moda', 'mas frecuente', 'mas repetido', 'que mas se repite', 'valor dominante'],
  varianza: ['varianza', 'variancia'],
  desviacion: ['desviacion', 'desviacion tipica', 'desviacion estandar', 'dispersion'],
  cuartiles: ['cuartil', 'cuartiles', 'q1', 'q2', 'q3'],
  percentiles: ['percentil', 'percentiles', 'p25', 'p50', 'p75', 'p90'],
  rango: ['rango', 'diferencia entre el maximo y el minimo', 'amplitud'],
  cv: ['coeficiente de variacion', 'variacion relativa'],
  frecuencias: ['frecuencia', 'frecuencias', 'tabla de frecuencias', 'distribucion de frecuencias', 'clases', 'intervalos', 'histograma'],
  combinatoria: ['combinacion', 'combinaciones', 'combinatoria'],
  permutacion: ['permutacion', 'permutaciones', 'ordenar', 'ordenamiento', 'disposiciones'],
  factorial: ['factorial'],
  eleccion: ['elegir', 'seleccionar', 'formas de', 'maneras de', 'de cuantos modos', 'cuantas formas', 'posibilidades'],
  probabilidad: ['probabilidad', 'probabilidades', 'evento', 'eventos', 'al azar', 'lanzar', 'dado', 'moneda', 'carta', 'dados'],
  bayes: ['bayes', 'teorema de bayes', 'probabilidad a posteriori'],
  condicional: ['dado que', 'si sabemos que', 'condicional', 'sabiendo que', 'conocido que'],
  union: ['union', 'al menos uno', 'o bien', 'uno u otro'],
  interseccion: ['interseccion', 'simultaneamente', 'a la vez'],
  independencia: ['independiente', 'independencia', 'no influye', 'por separado'],
  complemento: ['complemento', 'no ocurre', 'no sucede', 'que no'],
  total: ['probabilidad total', 'ley de la probabilidad total'],
};

const ORDEN_PREGUNTA = [
  'moda', 'mediana', 'media', 'varianza', 'desviacion', 'cuartiles', 'percentiles', 'cv', 'rango',
  'frecuencias', 'permutacion', 'combinatoria', 'factorial', 'bayes', 'condicional', 'union',
  'interseccion', 'independencia', 'complemento', 'probabilidad',
];

function detectarConceptos(texto) {
  const t = normalizar(texto);
  const encontrados = new Set();
  for (const [concepto, claves] of Object.entries(DICCIONARIO)) {
    if (claves.some((c) => t.includes(c))) encontrados.add(concepto);
  }
  if (/\bp\s*\(/i.test(texto)) encontrados.add('probabilidad');
  return [...encontrados];
}

function detectarPregunta(texto) {
  const t = normalizar(texto);
  const esPregunta = texto.includes('?') || /^(cuant|cuales|cual|que|indica|calcula|determina|halla|obten)/.test(t.trim());
  if (!esPregunta) return null;
  for (const c of ORDEN_PREGUNTA) if (t.includes(c.replace('combinatoria', 'combinacion'))) return c;
  return 'desconocida';
}

function redondear(v, d = 4) {
  if (v === null || v === undefined || Number.isNaN(v)) return v;
  const f = Math.pow(10, d);
  return Math.round((v + Number.EPSILON) * f) / f;
}

function listado(arr) {
  return arr.map((n) => (Number.isInteger(n) ? n : redondear(n, 3))).join(', ');
}

const NOMBRES_MEDIDA = {
  media: 'la media', mediana: 'la mediana', moda: 'la moda', varianza: 'la varianza',
  desviacion: 'la desviación estándar', cv: 'el coeficiente de variación', rango: 'el rango',
  cuartiles: 'los cuartiles', percentiles: 'los percentiles',
};

function construirDescriptiva(pregunta, datos, conceptos = []) {
  const r = calcularDescriptiva(datos, 'muestra');
  const valor = {
    media: r.media,
    mediana: r.mediana,
    moda: r.tieneModa ? listado(r.modas) : 'no hay moda (ningún valor se repite más que otro)',
    varianza: r.varianza,
    desviacion: r.desviacionEstandar,
    cv: `${redondear(r.coefVariacion, 2)}%`,
    rango: r.rango,
    cuartiles: `Q1 = ${r.q1}, Q2 = ${r.mediana}, Q3 = ${r.q3}`,
    percentiles: `P10 = ${r.percentiles.p10}, P50 = ${r.mediana}, P90 = ${r.percentiles.p90}`,
  };
  let objetivos = Object.keys(NOMBRES_MEDIDA).filter((c) => conceptos.includes(c));
  if (!objetivos.length) objetivos = [pregunta && NOMBRES_MEDIDA[pregunta] ? pregunta : 'media'];
  const partes = objetivos.map((o) => `${NOMBRES_MEDIDA[o]} es ${typeof valor[o] === 'number' ? redondear(valor[o]) : valor[o]}`);
  const respuesta = `Con n = ${r.n} datos (muestra): ${partes.join('; ')}.`;

  return {
    vista: 'descriptiva',
    tipo: 'descriptiva',
    resultado: r,
    objetivo: objetivos[0],
    pasos: r.pasos,
    respuesta,
    conclusion: `${r.interpretacion.sesgo} ${r.interpretacion.cv}`,
    preguntasSugeridas: ['¿Cuál es la mediana?', '¿Y la moda?', '¿Cuántos datos hay?', '¿Cuál es la desviación estándar?', '¿Y los cuartiles?'],
  };
}

function construirFrecuencias(pregunta, { numeros, categorias }) {
  if (categorias.length >= 2 && numeros.length < 2) {
    const r = calcularFrecuenciasCualitativas(categorias);
    const pasos = [
      `1. Los datos son cualitativos (texto): se detectaron ${r.numCategorias} categorias en total = ${r.n} registros.`,
      `2. Se cuenta cuantas veces aparece cada categoria.`,
      `3. Repeticiones: ${r.tabla.map((c) => `${c.categoria} = ${c.fa}`).join(', ')}.`,
      `4. Frecuencia relativa: fi / n  (n = ${r.n}).`,
      `5. Resultado: ${r.interpretacion}`,
    ];
    return {
      vista: 'frecuencias',
      tipo: 'frecuencias',
      categoria: 'cualitativas',
      resultado: r,
      pasos,
      respuesta: `Hay ${r.n} datos repartidos en ${r.numCategorias} categorias. ${r.interpretacion}`,
      preguntasSugeridas: ['¿Cuántos datos hay?', '¿Cuál es la categoría que más se repite?', '¿Cuántas veces aparece Azul?'],
    };
  }
  if (numeros.length < 2) {
    return {
      falta: 'No encuentro la lista de datos. Escribe los valores separados por comas, por ejemplo: 4, 8, 6, 5, 3, 5, 6, 2',
    };
  }
  const r = calcularFrecuencias(numeros);
  const pasos = [
    `1. Se detectaron ${r.n} datos numericos.`,
    `2. Regla de Sturges: k = 1 + 3.322 log10(n) = ${r.numClases} clases; amplitud = ${r.amplitud}.`,
    `3. Se reparten en intervalos y se cuenta la frecuencia absoluta (fi).`,
    `4. Frecuencia relativa: fi / n; acumulada: suma de fi anteriores.`,
    `5. Resumen: media = ${r.resumen.media}, mediana = ${r.resumen.mediana}, moda = ${r.resumen.moda}.`,
  ];
  return {
    vista: 'frecuencias',
    tipo: 'frecuencias',
    categoria: 'agrupados',
    resultado: r,
    pasos,
    respuesta: `Los ${r.n} datos se reparten en ${r.numClases} clases. Media agrupada = ${r.resumen.media}, mediana = ${r.resumen.mediana}, moda = ${r.resumen.moda}.`,
    preguntasSugeridas: ['¿Cuál es la media?', '¿Cuántos datos hay?', '¿Cuál es la mediana?'],
  };
}

function construirCombinatoria(conceptos, numeros, etiquetas) {
  const pN = etiquetas.find((e) => e.etiqueta === 'n' && e.tipo === 'parametro');
  const pR = etiquetas.find((e) => e.etiqueta === 'r' && e.tipo === 'parametro');
  const n = pN ? pN.valor : Math.max(...numeros.map(Math.round), 0);
  const r = pR ? pR.valor : (numeros.length > 1 ? Math.min(...numeros.map(Math.round)) : n);

  let tipo = 'combinacion';
  if (conceptos.includes('factorial') && numeros.length <= 1) tipo = 'factorial';
  else if (conceptos.includes('permutacion')) tipo = 'permutacion';
  else if (conceptos.includes('eleccion') && !conceptos.includes('combinatoria')) tipo = 'combinacion';

  if (numeros.length < 1) {
    return { falta: 'No encontré los valores de n (y r). Ejemplo: "n = 10, r = 3" o escribe los números en el enunciado.' };
  }

  const resultado = calcularCombinatoria({ tipo, n, r: tipo === 'factorial' ? undefined : r });
  const pasos = [
    `1. El problema pide ${resultado.nombre.replace(/\b\w/g, (c) => c.toUpperCase())}.`,
    `2. Datos extraidos: n = ${n}${tipo === 'factorial' ? '' : `, r = ${r}`}.`,
    `3. Formula: ${resultado.formula}.`,
    `4. Sustitucion: ${resultado.formula.replace(/n/g, String(n)).replace(/r/g, String(r))}.`,
    `5. Resultado: ${resultado.valorExacto}.`,
  ];
  return {
    vista: 'combinatoria',
    tipo: 'combinatoria',
    resultado,
    pasos,
    respuesta: `${resultado.nombre} con n = ${n}${tipo === 'factorial' ? '' : ` y r = ${r}`} es ${resultado.valorExacto}. ${resultado.ejemplo}`,
    preguntasSugeridas: ['¿Y si fuera permutación?', '¿Y con repetición?', '¿Cuánto es el factorial de n?'],
  };
}

function buscarProb(etiquetas, label) {
  const e = etiquetas.find((x) => x.etiqueta === label && x.tipo !== 'parametro');
  return e ? e.valor : undefined;
}

function construirProbabilidad(conceptos, texto, etiquetas, numeros) {
  const pa = buscarProb(etiquetas, 'A');
  const pb = buscarProb(etiquetas, 'B');
  const pab = buscarProb(etiquetas, 'A Y B') ?? buscarProb(etiquetas, 'A U B');
  const pabAB = buscarProb(etiquetas, 'A|B');
  const pba = buscarProb(etiquetas, 'B|A');

  const porcentajes = numeros.filter((_, i) => false);

  if (conceptos.includes('bayes')) {
    const priors = etiquetas.filter((e) => e.tipo === 'simple' && /^H/i.test(e.etiqueta));
    const cond = etiquetas.filter((e) => e.tipo === 'condicional');
    if (priors.length < 2) {
      return {
        falta: 'Para Bayes necesito las probabilidades previas (P(H1) = ..., P(H2) = ...) y la verosimilitud (P(E|H1) = ..., P(E|H2) = ...). Mientras tanto puedes escribirlas en la pestaña Probabilidad.',
      };
    }
    const hipotesis = priors.map((p) => {
      const verosimilitud = cond.find((c) => c.etiqueta.endsWith(`|${p.etiqueta}`));
      return { nombre: p.etiqueta, priori: p.valor, verosimilitud: verosimilitud ? verosimilitud.valor : 0 };
    });
    const resultado = calcularProbabilidad({ tipo: 'bayes', hipotesis });
    const pasos = [
      `1. Se detecto el teorema de Bayes con ${hipotesis.length} hipotesis.`,
      `2. Probabilidades previas: ${hipotesis.map((h) => `${h.nombre}=${h.priori}`).join(', ')} (suman ${redondear(hipotesis.reduce((a, h) => a + h.priori, 0))}).`,
      `3. Verosimilitudes: ${hipotesis.map((h) => `P(E|${h.nombre})=${h.verosimilitud}`).join(', ')}.`,
      `4. Probabilidad total: P(E) = ${resultado.probabilidadTotal}.`,
      `5. ${resultado.conclusion}`,
    ];
    return {
      vista: 'probabilidad',
      tipo: 'probabilidad',
      resultado,
      pasos,
      respuesta: resultado.conclusion,
      preguntasSugeridas: ['¿Cuál es la probabilidad total?', '¿Y si cambia la previa?'],
    };
  }

  if (pa === undefined && pb === undefined && pab === undefined && pabAB === undefined && pba === undefined) {
    const simple = etiquetas.find((e) => e.tipo === 'simple');
    if (simple && (simple.valor >= 0 && simple.valor <= 1) && conceptos.includes('complemento')) {
      const resultado = calcularProbabilidad({ tipo: 'complemento', p: simple.valor });
      return {
        vista: 'probabilidad',
        tipo: 'probabilidad',
        resultado,
        pasos: [`1. Se detecto probabilidad del complemento.`, `2. Dato: P = ${simple.valor}.`, `3. Formula: P(A') = 1 - P(A).`, `4. Resultado: ${resultado.resultado}.`],
        respuesta: `Si P(A) = ${simple.valor}, entonces P(A') = ${resultado.resultado}.`,
        preguntasSugeridas: ['¿Cuánto es la unión?', '¿Y la intersección?'],
      };
    }
    return {
      falta: 'No encontré probabilidades. Escríbelas con su etiqueta, por ejemplo: P(A) = 0.3, P(B) = 0.4, P(A y B) = 0.12.',
    };
  }

  let tipo = 'union';
  if (conceptos.includes('total')) tipo = 'probabilidad_total';
  else if (conceptos.includes('independencia')) tipo = 'independencia';
  else if (conceptos.includes('complemento') && pa !== undefined && pb === undefined) tipo = 'complemento';
  else if (conceptos.includes('condicional') || pabAB !== undefined || pba !== undefined) tipo = 'condicional';
  else if (conceptos.includes('interseccion')) tipo = 'interseccion';

  if (tipo === 'complemento') {
    const resultado = calcularProbabilidad({ tipo: 'complemento', p: pa });
    return {
      vista: 'probabilidad',
      tipo: 'probabilidad',
      resultado,
      pasos: [`1. Dato: P(A) = ${pa}.`, `2. Formula: P(A') = 1 - P(A).`, `3. Resultado: 1 - ${pa} = ${resultado.resultado}.`],
      respuesta: `P(A') = ${resultado.resultado}.`,
      preguntasSugeridas: ['¿Cuál es la unión?', '¿Y la probabilidad condicional?'],
    };
  }

  if (tipo === 'condicional') {
    if (pabAB !== undefined && pb !== undefined) {
      const resultado = calcularProbabilidad({ tipo: 'condicional', pab: pabAB, pb });
      return {
        vista: 'probabilidad',
        tipo: 'probabilidad',
        resultado,
        pasos: [`1. Datos: P(A y B) = ${pabAB}, P(B) = ${pb}.`, `2. Formula: P(A|B) = P(A y B) / P(B).`, `3. Resultado: ${pabAB} / ${pb} = ${resultado.resultado}.`],
        respuesta: `P(A|B) = ${resultado.resultado}.`,
        preguntasSugeridas: ['¿Y P(B|A)?', '¿Cuánto es la unión?'],
      };
    }
    if (pba !== undefined && pa !== undefined) {
      const resultado = calcularProbabilidad({ tipo: 'condicional', pab: pba, pb: pa });
      return {
        vista: 'probabilidad',
        tipo: 'probabilidad',
        resultado,
        pasos: [`1. Datos: P(A y B) = ${pba}, P(A) = ${pa}.`, `2. Formula: P(B|A) = P(A y B) / P(A).`, `3. Resultado: ${resultado.resultado}.`],
        respuesta: `P(B|A) = ${resultado.resultado}.`,
        preguntasSugeridas: ['¿Cuál es la unión?', '¿Son independientes?'],
      };
    }
    if (pab !== undefined && pb !== undefined && pa === undefined) {
      const resultado = calcularProbabilidad({ tipo: 'condicional', pab, pb });
      return {
        vista: 'probabilidad',
        tipo: 'probabilidad',
        resultado,
        pasos: [
          `1. Datos: P(A y B) = ${pab}, P(B) = ${pb}.`,
          `2. Formula: P(A|B) = P(A y B) / P(B).`,
          `3. Sustitucion: ${pab} / ${pb} = ${resultado.resultado}.`,
          `4. Resultado: P(A|B) = ${resultado.resultado}.`,
        ],
        respuesta: `P(A|B) = ${pab} / ${pb} = ${resultado.resultado}.`,
        preguntasSugeridas: ['¿Cuánto es P(B|A)?', '¿Cuánto es la unión?'],
      };
    }
    if (pab !== undefined && pa !== undefined && pb === undefined) {
      const resultado = calcularProbabilidad({ tipo: 'condicional', pab, pb: pa });
      return {
        vista: 'probabilidad',
        tipo: 'probabilidad',
        resultado,
        pasos: [
          `1. Datos: P(A y B) = ${pab}, P(A) = ${pa}.`,
          `2. Formula: P(B|A) = P(A y B) / P(A).`,
          `3. Sustitucion: ${pab} / ${pa} = ${resultado.resultado}.`,
        ],
        respuesta: `P(B|A) = ${resultado.resultado}.`,
        preguntasSugeridas: ['¿Cuánto es la unión?', '¿Son independientes?'],
      };
    }
    if (pa !== undefined && pb !== undefined && pab !== undefined) {
      const resultado = calcularProbabilidad({ tipo: 'condicional', pa, pb, pab });
      return {
        vista: 'probabilidad',
        tipo: 'probabilidad',
        resultado,
        pasos: [`1. Datos: P(A) = ${pa}, P(B) = ${pb}, P(A y B) = ${pab}.`, `2. P(A|B) = P(A y B)/P(B) = ${pab}/${pb} = ${resultado.resultado}.`, `3. P(B|A) = P(A y B)/P(A) = ${resultado.resultadoInverso}.`],
        respuesta: `P(A|B) = ${resultado.resultado} y P(B|A) = ${resultado.resultadoInverso}.`,
        preguntasSugeridas: ['¿Cuánto es la unión?', '¿Son independientes?'],
      };
    }
    return { falta: 'Para la condicional necesito P(A y B) y P(B). Ejemplo: P(A y B) = 0.12, P(B) = 0.4' };
  }

  if (pa === undefined || pb === undefined) {
    return { falta: 'Para esa operación necesito P(A) y P(B) (y P(A y B) si la tienes). Ejemplo: P(A) = 0.3, P(B) = 0.4, P(A y B) = 0.12.' };
  }

  if (tipo === 'independencia') {
    if (pab === undefined) return { falta: 'Falta P(A y B) para comprobar la independencia.' };
    const resultado = calcularProbabilidad({ tipo: 'independencia', pa, pb, pab });
    return {
      vista: 'probabilidad',
      tipo: 'probabilidad',
      resultado,
      pasos: [`1. Datos: P(A) = ${pa}, P(B) = ${pb}, P(A y B) = ${pab}.`, `2. P(A) x P(B) = ${redondear(pa * pb)}.`, `3. ${pab === redondear(pa * pb) ? 'Coinciden: son independientes.' : 'No coinciden: son dependientes.'}`],
      respuesta: resultado.notas,
      preguntasSugeridas: ['¿Cuánto es la unión?', '¿Cuánto es P(A|B)?'],
    };
  }

  const resultado = calcularProbabilidad({ tipo: 'union', pa, pb, pab });
  const pasos = [
    `1. Datos: P(A) = ${pa}, P(B) = ${pb}${pab !== undefined ? `, P(A y B) = ${pab}` : ''}.`,
    `2. Formula: ${pab !== undefined ? 'P(A u B) = P(A) + P(B) - P(A y B)' : 'P(A u B) = P(A) + P(B) - P(A)P(B) (independientes)'}.`,
    pab !== undefined
      ? `3. Sustitucion: ${pa} + ${pb} - ${pab} = ${resultado.resultado}.`
      : `3. P(A y B) = ${pa} x ${pb} = ${redondear(pa * pb)}; luego ${pa} + ${pb} - ${redondear(pa * pb)} = ${resultado.resultado}.`,
    `4. Resultado: P(A u B) = ${resultado.resultado}.`,
  ];
  return {
    vista: 'probabilidad',
    tipo: 'probabilidad',
    resultado,
    pasos,
    respuesta: `P(A u B) = ${resultado.resultado} (${redondear(resultado.resultado * 100, 2)}%).`,
    preguntasSugeridas: ['¿Cuánto es P(A y B)?', '¿Cuánto es P(A|B)?', '¿Son independientes?'],
  };
}

function analizarProblema(texto) {
  if (!texto || !String(texto).trim()) throw new Error('Escribe el enunciado del problema.');

  const conceptos = detectarConceptos(texto);
  const numerosBrutos = extraerNumeros(texto);
  const etiquetas = extraerEtiquetas(texto);
  const items = extraerItems(texto);
  const pregunta = detectarPregunta(texto);

  const numeros = items.numeros.length >= 2 ? items.numeros : numerosBrutos.map((n) => n.valor);

  const base = {
    conceptos: conceptos.length ? conceptos : [],
    pregunta,
    datosDetectados:
      numeros.length >= 2
        ? numeros.slice(0, 1000)
        : items.categorias.length
          ? items.categorias
          : numeros,
    etiquetasDetectadas: etiquetas.map((e) => `${e.etiqueta} = ${e.valor}`),
    falta: null,
  };

  let analisis = null;

  if (conceptos.includes('combinatoria') || conceptos.includes('permutacion') || conceptos.includes('factorial') || (conceptos.includes('eleccion') && numeros.length <= 3)) {
    analisis = construirCombinatoria(conceptos, numeros, etiquetas);
  } else if (conceptos.includes('probabilidad') || conceptos.includes('bayes') || etiquetas.some((e) => e.tipo !== 'parametro')) {
    analisis = construirProbabilidad(conceptos, texto, etiquetas, numeros);
  } else if (conceptos.includes('frecuencias') || items.categorias.length >= 3) {
    analisis = construirFrecuencias(pregunta, { numeros, categorias: items.categorias });
  } else if (['media', 'mediana', 'moda', 'varianza', 'desviacion', 'cuartiles', 'percentiles', 'rango', 'cv'].some((c) => conceptos.includes(c))) {
    if (items.categorias.length >= 2 && numeros.length < 2) {
      analisis = construirFrecuencias(pregunta, { numeros, categorias: items.categorias });
    } else if (numeros.length < 2) {
      analisis = { falta: 'Detecté estadística descriptiva, pero faltan los datos de la muestra. Escribe los valores separados por comas.' };
    } else {
      analisis = construirDescriptiva(pregunta, numeros, conceptos);
    }
  } else if (numeros.length >= 2 && items.categorias.length === 0 && /-?\d+(?:[.,]\d+)?\s*[,;\n]\s*-?\d+|^[\s\d.,;-]+$/.test(String(texto))) {
    // solo si hay una lista real de datos (no numeros sueltos dentro de una frase)
    analisis = construirDescriptiva(pregunta, numeros, conceptos);
  } else if (items.categorias.length >= 2) {
    analisis = construirFrecuencias(pregunta, { numeros, categorias: items.categorias });
  } else {
    analisis = {
      falta: 'No reconozco el tema ni encuentro datos. Prueba a escribir el enunciado completo con los números, por ejemplo: "Calcule la media de los datos: 4, 8, 6, 5, 3, 5".',
    };
  }

  if (analisis.falta) {
    return { ...base, falta: analisis.falta, tipo: null, vista: null, resultado: null, pasos: [], respuesta: '', preguntasSugeridas: ['¿Cuál es la media de 4, 8, 6, 5, 3, 5?', '¿Cuántas combinaciones hay de 10 en 3?', 'P(A) = 0.3, P(B) = 0.4, P(A y B) = 0.12, ¿cuánto es P(A u B)?'] };
  }

  return { ...base, ...analisis };
}

const AYUDA_CONSULTA = 'No entendí la pregunta. Puedo responder sobre: media, mediana, moda, varianza, desviación, cuartiles, percentiles, rango, máximo, mínimo, suma, cantidad de datos o frecuencia de una categoría.';

function consultar(pregunta, contexto) {
  if (!contexto || (!Array.isArray(contexto.datos) && !Array.isArray(contexto.categorias))) {
    return { respuesta: 'Primero analiza un problema para que recuerde sus datos.' };
  }
  const t = normalizar(pregunta);
  const { datos = [], categorias = [] } = contexto;

  if (/^(gracias|thx|grax)\b/.test(t)) {
    return { respuesta: 'De nada. Si quieres, sigue preguntando sobre estos datos (media, moda, frecuencias, porcentajes...).' };
  }

  if (/^(hola|buenas|hey|que tal|holi|buenos dias|buenas tardes|buenas noches)\b/.test(t)) {
    return {
      respuesta:
        'Hola. Pregúntame sobre los datos del problema: media, mediana, moda, varianza, desviación, cuartiles, percentiles, rango, suma, máximo, mínimo o frecuencia de una categoría.',
    };
  }

  if (!datos.length && !categorias.length) {
    return { respuesta: 'Este problema no tiene datos cargados. Analiza de nuevo el enunciado y vuelve a preguntar.' };
  }

  if (/cuantos datos|cuantos valores|cuantos registros|cuantos hay|tamanio|muestra de/.test(t) && datos.length) {
    return { respuesta: `Hay ${datos.length} datos en la muestra.` };
  }
  if (/cuantos datos|cuantos registros/.test(t) && categorias.length) {
    return { respuesta: `Hay ${categorias.length} registros.` };
  }
  if (/suma|total|suma de todos/.test(t) && datos.length) {
    const r = calcularDescriptiva(datos, 'poblacion');
    return { respuesta: `La suma de todos los datos es ${r.suma} (media = ${r.media}).` };
  }
  if (/maximo|mayor|mas grande/.test(t) && datos.length) {
    return { respuesta: `El valor máximo es ${Math.max(...datos)} y el mínimo es ${Math.min(...datos)}.` };
  }
  if (/minimo|menor|mas chico/.test(t) && datos.length) {
    return { respuesta: `El valor mínimo es ${Math.min(...datos)} y el máximo es ${Math.max(...datos)}.` };
  }
  if (/frecuencia|cuantas veces|cuantas repeticiones/.test(t)) {
    const hayCat = categorias.length ? categorias : datos;
    const objetivo = hayCat.find((c) => t.includes(normalizar(c)));
    if (objetivo) {
      const cuenta = hayCat.filter((c) => normalizar(c) === normalizar(objetivo)).length;
      return { respuesta: `"${objetivo}" aparece ${cuenta} ${cuenta === 1 ? 'vez' : 'veces'}.` };
    }
    if (categorias.length) {
      const r = calcularFrecuenciasCualitativas(categorias);
      return { respuesta: r.interpretacion };
    }
  }
  if (datos.length >= 2) {
    const r = calcularDescriptiva(datos, 'muestra');
    const mapa = {
      media: `La media es ${r.media}.`,
      promedio: `El promedio (media) es ${r.media}.`,
      mediana: `La mediana es ${r.mediana}.`,
      moda: r.tieneModa ? `La moda es ${r.modas.join(' y ')} (se repite ${Math.max(...Object.values(datos.reduce((a, v) => ((a[v] = (a[v] || 0) + 1), a), {})))} veces).` : 'No hay moda: ningún valor se repite.',
      varianza: `La varianza (muestra) es ${r.varianza}.`,
      desviacion: `La desviación estándar es ${r.desviacionEstandar}.`,
      cuartiles: `Q1 = ${r.q1}, Q2 (mediana) = ${r.mediana}, Q3 = ${r.q3}. El rango intercuartílico es ${r.rangoIntercuartilico}.`,
      percentiles: `p10 = ${r.percentiles.p10}, p25 = ${r.percentiles.p25}, p50 = ${r.percentiles.p50}, p75 = ${r.percentiles.p75}, p90 = ${r.percentiles.p90}.`,
      rango: `El rango es ${r.rango} (máximo ${r.max} - mínimo ${r.min}).`,
      coeficiente: `El coeficiente de variación es ${r.coefVariacion}%.`,
      dispersion: `Varianza = ${r.varianza}, desviación estándar = ${r.desviacionEstandar}, rango = ${r.rango}.`,
      ordenados: `Los datos ordenados son: ${r.datosOrdenados.join(', ')}.`,
      interpretacion: `${r.interpretacion.sesgo} ${r.interpretacion.curtosis}`,
    };
    for (const [clave, respuesta] of Object.entries(mapa)) {
      if (new RegExp(`(^|\\W)${clave}(\\W|$)`).test(t)) return { respuesta };
    }
  }
  if (categorias.length >= 2) {
    const r = calcularFrecuenciasCualitativas(categorias);
    if (/moda|mas frecuente|mas repetido|cual se repite/.test(t)) return { respuesta: r.interpretacion };
    if (/categorias|clases|repeticiones|lista/.test(t)) {
      return { respuesta: `Hay ${r.numCategorias} categorías: ${r.tabla.map((c) => `${c.categoria} (${c.fa})`).join(', ')}.` };
    }
    if (/(media|promedio|mediana|varianza|desviacion|cuartil|percentil|rango|coeficiente|dispersion)/.test(t)) {
      return {
        respuesta:
          `Estos datos son cualitativos (texto), así que no tienen media, mediana ni varianza. ` +
          `Lo que sí puedo calcular son frecuencias y proporciones. ${r.interpretacion}`,
      };
    }
    if (/cuantos datos|cuantos registros|total/.test(t)) {
      return { respuesta: `Hay ${r.n} datos repartidos en ${r.numCategorias} categorías.` };
    }
    if (/respuesta|resultado|resumen/.test(t)) return { respuesta: r.interpretacion };
    return {
      respuesta:
        `Con datos de texto puedo responder sobre: moda, categorías, frecuencias y porcentajes. ` +
        `${r.interpretacion}`,
    };
  }
  if (datos.length < 2) {
    return { respuesta: AYUDA_CONSULTA };
  }
  return { respuesta: AYUDA_CONSULTA };
}

module.exports = { analizarProblema, consultar, detectarConceptos, detectarPregunta };
