function parseNumbers(raw) {
  if (Array.isArray(raw)) {
    const arr = raw
      .map((v) => (typeof v === 'number' ? v : parseFloat(String(v).replace(',', '.'))))
      .filter((v) => v !== null && !Number.isNaN(v));
    if (!arr.length) throw new Error('La lista de datos esta vacia.');
    return arr;
  }
  if (typeof raw !== 'string' || !raw.trim()) {
    throw new Error('Debes ingresar al menos un dato numerico.');
  }
  const partes = raw.split(/[\s,;|\n\t]+/).filter(Boolean);
  const numeros = [];
  for (const p of partes) {
    const v = parseFloat(p.replace(',', '.'));
    if (Number.isNaN(v)) throw new Error(`"${p}" no es un numero valido.`);
    numeros.push(v);
  }
  if (!numeros.length) throw new Error('Debes ingresar al menos un dato numerico.');
  return numeros;
}

function round(value, decimales = 6) {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  if (!Number.isFinite(value)) return null;
  const f = Math.pow(10, decimales);
  return Math.round((value + Number.EPSILON) * f) / f;
}

function factorial(n) {
  if (!Number.isInteger(n) || n < 0) throw new Error('El factorial requiere un entero >= 0.');
  if (n > 170) throw new Error('El numero es demasiado grande (maximo 170).');
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

// Factorial exacto con BigInt (sin perder precision en numeros grandes)
function factorialBig(n) {
  if (!Number.isInteger(n) || n < 0) throw new Error('El factorial requiere un entero >= 0.');
  let r = 1n;
  for (let i = 2n; i <= BigInt(n); i++) r *= i;
  return r;
}

// Producto n x (n-1) x ... x (n-k+1) en BigInt
function productoDescendente(n, k) {
  let r = 1n;
  for (let i = 0; i < k; i++) r *= BigInt(n - i);
  return r;
}

// Muestra un BigInt de forma legible: exacto si es corto, notacion cientifica si es enorme
function formatearBig(b) {
  const s = b.toString();
  if (s.length <= 21) return s;
  return `${s[0]}.${s.slice(1, 7)} x 10^${s.length - 1}`;
}

function validarEntero(v, nombre) {
  if (v === '' || v === null || v === undefined) throw new Error(`Falta el valor de ${nombre}.`);
  const n = Number(v);
  if (!Number.isInteger(n) || n < 0) throw new Error(`${nombre} debe ser un entero >= 0.`);
  return n;
}

module.exports = { parseNumbers, round, factorial, factorialBig, productoDescendente, formatearBig, validarEntero };
