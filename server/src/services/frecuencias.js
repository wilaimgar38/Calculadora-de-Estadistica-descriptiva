const { round } = require('../util/numeros');

function sturges(n) {
  return Math.max(1, Math.round(1 + 3.322 * Math.log10(n)));
}

function decimalesDe(v) {
  const s = String(v);
  if (s.includes('e')) return 6;
  const i = s.indexOf('.');
  return i === -1 ? 0 : s.length - i - 1;
}

// Construye k clases de igual amplitud empezando en el minimo.
// La amplitud se redondea HACIA ARRIBA a la precision de los datos (criterio de los libros de texto).
function construirClases(datos, numClases) {
  const ord = datos.slice().sort((a, b) => a - b);
  const n = ord.length;
  const min = ord[0];
  const max = ord[n - 1];
  const rango = max - min;
  const k = rango === 0 ? 1 : numClases ?? sturges(n);
  const d = Math.min(Math.max(...datos.map(decimalesDe)), 6);
  const unidad = 1 / 10 ** d;
  let ancho = rango === 0 ? unidad : Math.ceil(round(rango / k / unidad, 9)) * unidad;
  ancho = round(ancho, d + 2);
  const dec = d + 2;

  const clases = [];
  for (let i = 0; i < k; i++) {
    const inicio = round(min + ancho * i, dec);
    const fin = round(min + ancho * (i + 1), dec);
    clases.push({ inicio, fin, marca: round((inicio + fin) / 2, dec + 1), fa: 0 });
  }
  datos.forEach((v) => {
    let idx = clases.findIndex((c, i) => v >= c.inicio && (v < c.fin || (i === k - 1 && v <= c.fin + 1e-9)));
    if (idx === -1) idx = v < min ? 0 : k - 1;
    clases[idx].fa += 1;
  });
  return { clases, min, max, rango, ancho, k, decimalesDatos: d };
}

function interpolar(tabla, posicion) {
  let previo = 0;
  for (let i = 0; i < tabla.length; i++) {
    const c = tabla[i];
    if (previo + c.fa >= posicion && c.fa > 0) {
      return { valor: c.inicio + ((posicion - previo) / c.fa) * (c.fin - c.inicio), clase: c, faAnterior: previo };
    }
    previo += c.fa;
  }
  const ult = tabla[tabla.length - 1];
  return { valor: ult.fin, clase: ult, faAnterior: previo - ult.fa };
}

function calcularFrecuencias(raw, numClases, tipo = 'muestra') {
  const datos = (Array.isArray(raw) ? raw : []).map(Number).filter((v) => Number.isFinite(v));
  const n = datos.length;
  if (n < 2) throw new Error('Se necesitan al menos 2 datos numericos para construir la tabla de frecuencias.');
  let k;
  if (numClases !== undefined && numClases !== null && numClases !== '') {
    k = Number(numClases);
    if (!Number.isInteger(k) || k < 1 || k > 50) throw new Error('El numero de clases debe ser un entero entre 1 y 50.');
  }
  const { clases, min, max, rango, ancho, k: K, decimalesDatos } = construirClases(datos, k);
  const kSturges = 1 + 3.322 * Math.log10(n);
  const r4 = (v) => round(v, 4);
  const pasosIniciales = [
    { titulo: 'Número de datos y rango', formula: 'R = max - min', detalle: `n = ${n}; R = ${max} - ${min} = ${r4(rango)}` },
    {
      titulo: 'Número de clases',
      formula: k ? 'k elegido por el usuario' : 'Regla de Sturges: k = 1 + 3.322 log10(n)',
      detalle: k ? `k = ${K}` : `k = 1 + 3.322 x log10(${n}) = ${r4(kSturges)} ≈ ${K}`,
    },
    {
      titulo: 'Amplitud de clase',
      formula: 'A = R / k (redondeada hacia arriba a la precisión de los datos)',
      detalle: `A = ${r4(rango)} / ${K} = ${r4(rango / K)} -> A = ${ancho}`,
    },
  ];
  const r = analizarClases(clases, tipo, pasosIniciales);
  return {
    ...r,
    min: round(min),
    max: round(max),
    rango: round(rango),
    numClasesSturges: round(kSturges, 4),
    metodoClases: k ? 'manual' : 'Sturges',
    amplitud: ancho,
    decimalesDatos,
  };
}

// Tabla agrupada que ya viene dada en el problema: [{ inicio, fin, frecuencia }]
function calcularDesdeTablaAgrupada(clasesDadas, tipo = 'muestra') {
  if (!Array.isArray(clasesDadas) || !clasesDadas.length) throw new Error('La tabla agrupada esta vacia.');
  const clases = clasesDadas
    .map((c) => ({ inicio: Number(c.inicio), fin: Number(c.fin), fa: Number(c.frecuencia ?? c.fa) }))
    .sort((a, b) => a.inicio - b.inicio)
    .map((c) => {
      if (![c.inicio, c.fin, c.fa].every(Number.isFinite) || c.fin <= c.inicio || c.fa < 0 || !Number.isInteger(c.fa)) {
        throw new Error('Cada clase necesita limite inferior < superior y una frecuencia entera >= 0.');
      }
      return { ...c, marca: round((c.inicio + c.fin) / 2, 6) };
    });
  const r = analizarClases(clases, tipo, [
    { titulo: 'Tabla dada en el problema', formula: '', detalle: `${clases.length} clases, n = Σfi = ${clases.reduce((a, c) => a + c.fa, 0)}` },
  ]);
  const anchos = [...new Set(clases.map((c) => round(c.fin - c.inicio, 6)))];
  return {
    ...r,
    min: clases[0].inicio,
    max: clases[clases.length - 1].fin,
    rango: round(clases[clases.length - 1].fin - clases[0].inicio),
    metodoClases: 'dada',
    amplitud: anchos.length === 1 ? anchos[0] : null,
  };
}

function analizarClases(clases, tipo, pasosIniciales = []) {
  const n = clases.reduce((a, c) => a + c.fa, 0);
  if (n < 1) throw new Error('La suma de frecuencias debe ser mayor que 0.');
  const K = clases.length;
  let faAcum = 0;
  const tabla = clases.map((c, i) => {
    faAcum += c.fa;
    return {
      indice: i + 1,
      intervalo: `[${c.inicio}, ${c.fin}${i === clases.length - 1 ? ']' : ')'}`,
      inicio: c.inicio,
      fin: c.fin,
      marca: c.marca,
      fa: c.fa,
      fr: round(c.fa / n),
      frPorcentaje: round((c.fa / n) * 100, 2),
      faAcum,
      frAcum: round(faAcum / n),
      frAcumPorcentaje: round((faAcum / n) * 100, 2),
      xf: round(c.marca * c.fa),
    };
  });

  const sumaXF = tabla.reduce((acc, c) => acc + c.marca * c.fa, 0);
  const media = sumaXF / n;
  tabla.forEach((c) => {
    c.desvCuadF = round((c.marca - media) ** 2 * c.fa);
  });
  const sumaDesv = tabla.reduce((acc, c) => acc + (c.marca - media) ** 2 * c.fa, 0);
  const esPoblacion = tipo === 'poblacion';
  const divisor = esPoblacion ? n : n - 1;
  const varianza = divisor > 0 ? sumaDesv / divisor : 0;
  const desviacion = Math.sqrt(varianza);

  const med = interpolar(tabla, n / 2);
  const q1 = interpolar(tabla, n / 4);
  const q3 = interpolar(tabla, (3 * n) / 4);

  const maxFa = Math.max(...tabla.map((c) => c.fa));
  const iModa = tabla.findIndex((c) => c.fa === maxFa);
  const claseModa = tabla[iModa];
  const anchoModa = claseModa.fin - claseModa.inicio;
  const d1 = maxFa - (tabla[iModa - 1]?.fa ?? 0);
  const d2 = maxFa - (tabla[iModa + 1]?.fa ?? 0);
  const moda = d1 + d2 > 0 ? claseModa.inicio + (d1 / (d1 + d2)) * anchoModa : claseModa.marca;

  const r4 = (v) => round(v, 4);
  const anchoMed = round(med.clase.fin - med.clase.inicio, 6);
  const pasos = [
    ...pasosIniciales,
    { titulo: 'Marca de clase', formula: 'xi = (Li + Ls) / 2', detalle: `Ejemplo clase 1: (${tabla[0].inicio} + ${tabla[0].fin}) / 2 = ${tabla[0].marca}` },
    { titulo: 'Media agrupada', formula: 'x̄ = Σ(xi·fi) / n', detalle: `x̄ = ${r4(sumaXF)} / ${n} = ${r4(media)}` },
    {
      titulo: 'Mediana agrupada',
      formula: 'Md = Li + ((n/2 - Fi-1) / fi) · A',
      detalle: `Clase ${med.clase.intervalo}: ${med.clase.inicio} + ((${n / 2} - ${med.faAnterior}) / ${med.clase.fa}) x ${anchoMed} = ${r4(med.valor)}`,
    },
    {
      titulo: 'Moda agrupada',
      formula: 'Mo = Li + (d1 / (d1 + d2)) · A',
      detalle: `Clase modal ${claseModa.intervalo}: d1 = ${d1}, d2 = ${d2} -> ${claseModa.inicio} + (${d1} / ${d1 + d2 || 1}) x ${round(anchoModa, 6)} = ${r4(moda)}`,
    },
    {
      titulo: 'Varianza agrupada',
      formula: `${esPoblacion ? 'σ²' : 's²'} = Σ(xi - x̄)²·fi / ${esPoblacion ? 'N' : '(n - 1)'}`,
      detalle: `${r4(sumaDesv)} / ${divisor} = ${r4(varianza)}; desviacion = √${r4(varianza)} = ${r4(desviacion)}`,
    },
  ];

  const ojiva = [{ x: tabla[0].inicio, Fa: 0, porcentaje: 0 }, ...tabla.map((c) => ({ x: c.fin, Fa: c.faAcum, porcentaje: c.frAcumPorcentaje }))];
  const a0 = tabla[0].fin - tabla[0].inicio;
  const aN = tabla[K - 1].fin - tabla[K - 1].inicio;
  const poligono = [
    { x: round(tabla[0].marca - a0, 6), fa: 0 },
    ...tabla.map((c) => ({ x: c.marca, fa: c.fa })),
    { x: round(tabla[K - 1].marca + aN, 6), fa: 0 },
  ];

  return {
    modo: 'cuantitativas',
    n,
    numClases: K,
    tabla,
    totales: { fa: n, fr: 1, frPorcentaje: 100, xf: round(sumaXF), desvCuadF: round(sumaDesv) },
    resumen: {
      media: round(media),
      mediana: round(med.valor),
      moda: round(moda),
      q1: round(q1.valor),
      q3: round(q3.valor),
      varianza: round(varianza),
      desviacionEstandar: round(desviacion),
      coefVariacion: media !== 0 ? round((desviacion / Math.abs(media)) * 100, 4) : null,
      claseModal: claseModa.intervalo,
      claseMediana: med.clase.intervalo,
    },
    graficas: { ojiva, poligono },
    pasos,
    tipo: esPoblacion ? 'poblacion' : 'muestra',
  };
}

module.exports = { calcularFrecuencias, calcularDesdeTablaAgrupada, sturges };
