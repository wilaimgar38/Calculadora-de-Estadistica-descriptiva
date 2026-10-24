const { round } = require('../util/numeros');

// Percentil por interpolacion lineal (mismo metodo que PERCENTIL.INC de Excel)
function percentil(ord, p) {
  if (!ord.length) return null;
  const idx = (p / 100) * (ord.length - 1);
  const bajo = Math.floor(idx);
  const alto = Math.ceil(idx);
  if (bajo === alto) return ord[bajo];
  return ord[bajo] + (idx - bajo) * (ord[alto] - ord[bajo]);
}

const f = (v, d = 4) => (v === null || v === undefined ? '—' : String(round(v, d)));

function tablaPorValores(datos) {
  const n = datos.length;
  const conteo = new Map();
  datos.forEach((v) => conteo.set(v, (conteo.get(v) || 0) + 1));
  let acum = 0;
  return [...conteo.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([x, fa]) => {
      acum += fa;
      return {
        valor: x,
        fa,
        fr: round(fa / n),
        frPorcentaje: round((fa / n) * 100, 2),
        faAcum: acum,
        frAcumPorcentaje: round((acum / n) * 100, 2),
        xf: round(x * fa),
      };
    });
}

function calcularDescriptiva(raw, tipo = 'muestra') {
  const datos = (Array.isArray(raw) ? raw : []).map(Number).filter((v) => Number.isFinite(v));
  const n = datos.length;
  if (n === 0) throw new Error('Debes ingresar al menos un dato numérico.');
  const esPoblacion = tipo === 'poblacion';
  if (!esPoblacion && n < 2) throw new Error('Se necesitan al menos 2 datos para calcular la varianza de una muestra.');

  const ord = datos.slice().sort((a, b) => a - b);
  const suma = datos.reduce((a, b) => a + b, 0);
  const media = suma / n;
  const min = ord[0];
  const max = ord[n - 1];
  const rango = max - min;

  // Moda: valores con la mayor frecuencia (si todos se repiten igual, no hay moda)
  const tablaValores = tablaPorValores(datos);
  const maxFrec = Math.max(...tablaValores.map((t) => t.fa));
  const todosIguales = tablaValores.every((t) => t.fa === maxFrec);
  const modas = maxFrec > 1 && !(todosIguales && tablaValores.length > 1)
    ? tablaValores.filter((t) => t.fa === maxFrec).map((t) => t.valor)
    : [];
  const tipoModa = modas.length === 0 ? 'Amodal (sin moda)' : modas.length === 1 ? 'Unimodal' : modas.length === 2 ? 'Bimodal' : 'Multimodal';

  const sumaCuadrados = datos.reduce((acc, v) => acc + (v - media) ** 2, 0);
  const varianzaMuestral = n > 1 ? sumaCuadrados / (n - 1) : null;
  const varianzaPoblacional = sumaCuadrados / n;
  const varianza = esPoblacion ? varianzaPoblacional : varianzaMuestral;
  const desviacion = Math.sqrt(varianza);

  const q1 = percentil(ord, 25);
  const q2 = percentil(ord, 50);
  const q3 = percentil(ord, 75);
  const ric = q3 - q1;
  const cv = media !== 0 ? (desviacion / Math.abs(media)) * 100 : null;
  const errorEstandar = desviacion / Math.sqrt(n);

  // Forma: coeficiente de asimetria de Fisher y curtosis (exceso), con momentos centrales
  const m2 = varianzaPoblacional;
  const m3 = datos.reduce((acc, v) => acc + (v - media) ** 3, 0) / n;
  const m4 = datos.reduce((acc, v) => acc + (v - media) ** 4, 0) / n;
  const sesgo = m2 > 0 ? m3 / m2 ** 1.5 : null;
  const curtosis = m2 > 0 ? m4 / m2 ** 2 - 3 : null;
  const sesgoPearson = desviacion > 0 ? (3 * (media - q2)) / desviacion : null;

  // Diagrama de caja (criterio de Tukey 1.5 x RIC)
  const limInf = q1 - 1.5 * ric;
  const limSup = q3 + 1.5 * ric;
  const atipicos = ord.filter((v) => v < limInf || v > limSup);
  const dentro = ord.filter((v) => v >= limInf && v <= limSup);
  const caja = {
    min: round(min),
    max: round(max),
    q1: round(q1),
    mediana: round(q2),
    q3: round(q3),
    bigoteInferior: round(dentro.length ? dentro[0] : min),
    bigoteSuperior: round(dentro.length ? dentro[dentro.length - 1] : max),
    limiteInferior: round(limInf),
    limiteSuperior: round(limSup),
    atipicos: atipicos.map((v) => round(v)),
  };

  const interpretacion = {
    sesgo:
      sesgo === null
        ? 'Sin dispersión, no se puede evaluar la asimetría.'
        : Math.abs(sesgo) < 0.25
          ? 'Distribución aproximadamente simétrica.'
          : sesgo > 0
            ? 'Asimetría positiva: cola hacia la derecha (media > mediana).'
            : 'Asimetría negativa: cola hacia la izquierda (media < mediana).',
    curtosis:
      curtosis === null
        ? 'Sin dispersión, no se puede evaluar la curtosis.'
        : curtosis > 0.5
          ? 'Leptocúrtica: más apuntada que la normal.'
          : curtosis < -0.5
            ? 'Platicúrtica: más aplanada que la normal.'
            : 'Mesocúrtica: forma parecida a la normal.',
    cv:
      cv === null
        ? 'No se puede calcular el CV porque la media es 0.'
        : cv < 15
          ? 'Datos homogéneos (poca variabilidad relativa).'
          : cv < 30
            ? 'Variabilidad moderada.'
            : 'Datos heterogéneos (mucha variabilidad relativa).',
    atipicos: atipicos.length ? `Hay ${atipicos.length} dato(s) atípico(s): ${atipicos.join(', ')}.` : 'No hay datos atípicos.',
  };

  const sv = esPoblacion ? 'σ²' : 's²';
  const sd = esPoblacion ? 'σ' : 's';
  const mu = esPoblacion ? 'μ' : 'x̄';
  const div = esPoblacion ? 'N' : 'n - 1';
  const divValor = esPoblacion ? n : n - 1;
  const terminos = datos.length <= 12 ? datos.map((v) => `(${v} - ${f(media)})²`).join(' + ') : `Σ(xi - ${mu})² de los ${n} datos`;

  const pasos = [
    { titulo: 'Ordenar los datos', formula: '', detalle: ord.join(', ') },
    { titulo: 'Media', formula: `${mu} = Σxi / ${esPoblacion ? 'N' : 'n'}`, detalle: `${mu} = ${f(suma)} / ${n} = ${f(media)}` },
    {
      titulo: 'Mediana',
      formula: n % 2 ? 'Md = dato en la posición (n + 1) / 2' : 'Md = promedio de los dos datos centrales',
      detalle: n % 2
        ? `Posición ${(n + 1) / 2} -> Md = ${f(q2)}`
        : `Posiciones ${n / 2} y ${n / 2 + 1}: (${ord[n / 2 - 1]} + ${ord[n / 2]}) / 2 = ${f(q2)}`,
    },
    {
      titulo: 'Moda',
      formula: 'Mo = valor con mayor frecuencia',
      detalle: modas.length ? `${modas.join(', ')} (se repite ${maxFrec} veces) -> ${tipoModa}` : 'Ningún valor se repite más que los demás: no hay moda.',
    },
    { titulo: 'Rango', formula: 'R = max - min', detalle: `R = ${max} - ${min} = ${f(rango)}` },
    { titulo: 'Varianza', formula: `${sv} = Σ(xi - ${mu})² / (${div})`, detalle: `${sv} = [${terminos}] / ${divValor} = ${f(sumaCuadrados)} / ${divValor} = ${f(varianza)}` },
    { titulo: 'Desviación estándar', formula: `${sd} = √${sv}`, detalle: `${sd} = √${f(varianza)} = ${f(desviacion)}` },
    { titulo: 'Coeficiente de variación', formula: `CV = (${sd} / ${mu}) x 100`, detalle: cv === null ? 'No definido (media = 0)' : `CV = (${f(desviacion)} / ${f(media)}) x 100 = ${f(cv, 2)}%` },
    { titulo: 'Cuartiles', formula: 'Qk en la posición 1 + k(n - 1)/4 (interpolación lineal)', detalle: `Q1 = ${f(q1)}, Q2 = ${f(q2)}, Q3 = ${f(q3)}; RIC = Q3 - Q1 = ${f(ric)}` },
  ];

  return {
    modo: 'cuantitativas',
    n,
    suma: round(suma),
    media: round(media),
    mediana: round(q2),
    modas,
    moda: modas.length ? modas[0] : null,
    tieneModa: modas.length > 0,
    tipoModa,
    frecuenciaModa: maxFrec,
    min: round(min),
    max: round(max),
    rango: round(rango),
    varianza: round(varianza),
    desviacionEstandar: round(desviacion),
    varianzaMuestral: round(varianzaMuestral),
    varianzaPoblacional: round(varianzaPoblacional),
    desviacionMuestral: varianzaMuestral === null ? null : round(Math.sqrt(varianzaMuestral)),
    desviacionPoblacional: round(Math.sqrt(varianzaPoblacional)),
    errorEstandar: round(errorEstandar),
    coefVariacion: round(cv),
    q1: round(q1),
    q2: round(q2),
    q3: round(q3),
    rangoIntercuartilico: round(ric),
    percentiles: {
      p10: round(percentil(ord, 10)),
      p25: round(q1),
      p50: round(q2),
      p75: round(q3),
      p90: round(percentil(ord, 90)),
    },
    sesgo: round(sesgo),
    sesgoPearson: round(sesgoPearson),
    curtosis: round(curtosis),
    caja,
    interpretacion,
    tipo: esPoblacion ? 'poblacion' : 'muestra',
    datosOrdenados: ord,
    tablaValores,
    pasos,
  };
}

module.exports = { calcularDescriptiva, percentil, tablaPorValores };
