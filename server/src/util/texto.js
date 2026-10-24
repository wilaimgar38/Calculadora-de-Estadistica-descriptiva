const BASICOS = {
  cero: 0, uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  dieciseis: 16, diecisiete: 17, dieciocho: 18, diecinueve: 19, veinte: 20,
  veintiuno: 21, veintiuna: 21, veintidos: 22, veintitres: 23, veinticuatro: 24,
  veinticinco: 25, veintiseis: 26, veintisiete: 27, veintiocho: 28, veintinueve: 29,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  cien: 100, ciento: 100, mil: 1000, millon: 1000000,
};

const CENTENAS = {
  doscientos: 200, doscientas: 200, trescientos: 300, trescientas: 300, cuatrocientos: 400,
  cuatrocientas: 400, quinientos: 500, quinientas: 500, seiscientos: 600, seiscientas: 600,
  setecientos: 700, setecientas: 700, ochocientos: 800, ochocientas: 800, novecientos: 900,
  novecientas: 900,
};

function normalizar(texto) {
  return String(texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function esPalabraNumero(token) {
  return Object.prototype.hasOwnProperty.call(BASICOS, token) || Object.prototype.hasOwnProperty.call(CENTENAS, token);
}

function valorPalabra(token) {
  if (Object.prototype.hasOwnProperty.call(BASICOS, token)) return BASICOS[token];
  if (Object.prototype.hasOwnProperty.call(CENTENAS, token)) return CENTENAS[token];
  return null;
}

// Convierte una racha de palabras ("treinta y dos") en numero
function palabrasANumero(tokens, i) {
  const base = valorPalabra(tokens[i]);
  if (base === null) return null;

  if (tokens[i] === 'mil') {
    const ant = i > 0 && valorPalabra(tokens[i - 1]) !== null && valorPalabra(tokens[i - 1]) >= 100 ? valorPalabra(tokens[i - 1]) : 1;
    return { valor: ant * 1000, desde: i, hasta: i };
  }

  let total = base;
  let j = i;
  while (j + 1 < tokens.length) {
    const sig = tokens[j + 1];
    if (sig === 'y' && j + 2 < tokens.length) {
      const v = valorPalabra(tokens[j + 2]);
      if (v !== null && v < 100 && total < 1000) {
        total += v;
        j += 2;
        continue;
      }
      break;
    }
    const v = valorPalabra(sig);
    if (v !== null && v >= 100 && total < 100) {
      total = v + total;
      j += 1;
      continue;
    }
    break;
  }
  return { valor: total, desde: i, hasta: j };
}

function extraerNumeros(texto) {
  const original = String(texto || '');
  const encuentros = [];

  const reDigits = /\d+(?:[.,]\d+)?/g;
  let m;
  while ((m = reDigits.exec(original)) !== null) {
    const despues = original.slice(m.index + m[0].length, m.index + m[0].length + 2);
    const esPorcentaje = despues.trimStart().startsWith('%');
    encuentros.push({
      indice: m.index,
      longitud: m[0].length,
      valor: parseFloat(m[0].replace(',', '.')),
      esPorcentaje,
      fuente: m[0],
    });
  }

  const tokens = normalizar(original).split(/[^a-z]+/).filter(Boolean);
  const usados = new Set();
  for (let i = 0; i < tokens.length; i++) {
    if (usados.has(i) || !esPalabraNumero(tokens[i])) continue;
    const r = palabrasANumero(tokens[i], i) || palabrasANumero(tokens[i]);
    if (!r) continue;
    for (let k = r.desde; k <= r.hasta; k++) usados.add(k);
    encuentros.push({ indice: -1, longitud: 0, valor: r.valor, esPorcentaje: false, fuente: tokens.slice(r.desde, r.hasta + 1).join(' ') });
  }

  return encuentros.sort((a, b) => (a.indice === -1 ? 1 : b.indice === -1 ? -1 : a.indice - b.indice));
}

// etiquetas tipo P(A) = 0.3, n = 10, r = 3, media = 20, P(A y B) = 0.12, P(A|B) = 0.4
function extraerEtiquetas(texto) {
  const t = String(texto || '').replace(/\s*=\s*/g, '=').replace(/(\d),(\d)/g, '$1.$2');
  const etiquetas = [];
  const reP = /p\s*\(?\s*([^)=]{1,20}?)\s*\)?\s*=\s*(\d+(?:[.,]\d+)?)/gi;
  let m;
  while ((m = reP.exec(t)) !== null) {
    const etiqueta = m[1].replace(/\s+/g, ' ').trim().toUpperCase();
    etiquetas.push({ etiqueta, tipo: etiqueta.includes('|') ? 'condicional' : etiqueta.includes(' Y ') || etiqueta.includes(' U ') ? 'conjunta' : 'simple', valor: parseFloat(m[2].replace(',', '.')) });
  }
  const reParam = /\b(n|r|k|media|mediana|moda|varianza|desviacion|total|suma)\s*=\s*(\d+(?:[.,]\d+)?)/gi;
  while ((m = reParam.exec(t)) !== null) {
    etiquetas.push({ etiqueta: m[1].toLowerCase(), tipo: 'parametro', valor: parseFloat(m[2].replace(',', '.')) });
  }
  return etiquetas;
}

const STOPWORDS = new Set([
  'de','la','el','los','las','un','una','unos','unas','y','o','u','en','con','por','para','que','se','es','son',
  'al','del','como','mas','muy','su','sus','lo','le','les','me','te','nos','mi','tu','si','no','sobre','entre',
  'hasta','desde','cuando','donde','cual','cuales','cual','cuanto','cuanta','cuantos','cuantas','cómo','cual',
  'que','esta','este','esto','estos','estas','fue','ser','hay','tiene','tiene','cada','todo','todos','toda',
]);

// Items separados por comas/saltos: devuelve { numeros:[], categorias:[] }
function extraerItems(texto) {
  const marcado = String(texto || '').split(':').pop();
  const partes = marcado
    .split(/[\n\r\t,;|•·]+/)
    .map((s) =>
      s
        .replace(/^[\s\-–—*+‣▪◦∙]+/, '')
        .replace(/[.;:]+$/, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean);

  const numeros = [];
  const categorias = [];
  for (const p of partes) {
    const base = p
      .split(/[\?¿]/)[0]
      .trim()
      .replace(/^[\s\-–—*+‣▪◦∙]+/, '')
      .replace(/[.;:]+$/, '')
      .trim();
    if (!base) continue;
    const limpio = normalizar(base);
    if (/^-?\d+(?:[.,]\d+)?$/.test(limpio)) {
      numeros.push(parseFloat(limpio.replace(',', '.')));
    } else {
      if (/\d/.test(base)) extraerNumeros(base).forEach((e) => numeros.push(e.valor));
      if (limpio.split(' ').length <= 4 && !STOPWORDS.has(limpio)) categorias.push(base);
    }
  }
  return { numeros, categorias, partes };
}

module.exports = {
  normalizar,
  extraerNumeros,
  extraerEtiquetas,
  extraerItems,
  esPalabraNumero,
  STOPWORDS,
};
