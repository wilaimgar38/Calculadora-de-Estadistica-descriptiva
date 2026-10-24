// Viñetas de listas pegadas desde Word (•, -, *). Un '-' pegado a un numero es un signo negativo.
const MARCA_LISTA = /^(?:[\s•·‣▪◦∙*+–—]|-(?![\d.]))+/;

function limpiarToken(t) {
  return t
    .replace(MARCA_LISTA, '')
    .replace(/[.;:]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function partirTexto(raw) {
  if (Array.isArray(raw)) return raw.map((v) => limpiarToken(String(v))).filter(Boolean);
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Debes ingresar al menos un dato.');
  }
  return raw
    .split(/[\n\r\t,;|]+/)
    .map(limpiarToken)
    .filter(Boolean)
    .flatMap(separarNumerosConEspacios);
}

// "4 8 6 5" (numeros separados solo por espacios) -> ["4", "8", "6", "5"]
const SERIE_CON_ESPACIOS = /^[-+]?\d+(?:[.,]\d+)?(?:\s+[-+]?\d+(?:[.,]\d+)?)+$/;
function separarNumerosConEspacios(token) {
  return SERIE_CON_ESPACIOS.test(token) ? token.split(/\s+/) : [token];
}

function parseCategorias(raw) {
  const tokens = partirTexto(raw);
  if (!tokens.length) throw new Error('Debes ingresar al menos un dato.');
  return tokens;
}

function esNumero(token) {
  if (!token) return false;
  const t = String(token).trim().replace(',', '.');
  return t !== '' && Number.isFinite(Number(t));
}

function esSerieNumerica(tokens) {
  return tokens.length > 0 && tokens.every(esNumero);
}

function clave(texto) {
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

module.exports = { parseCategorias, esSerieNumerica, esNumero, partirTexto, clave };
