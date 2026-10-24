const { validarEntero, factorialBig, productoDescendente, formatearBig } = require('../util/numeros');

const LIMITE_N = 5000;

function comb(n, r) {
  const k = Math.min(r, n - r);
  return productoDescendente(n, k) / factorialBig(k);
}

function calcularCombinatoria({ tipo, n, r }) {
  const N = validarEntero(n, 'n');
  const R = r === undefined || r === null || r === '' ? N : validarEntero(r, 'r');
  if (N > LIMITE_N || R > LIMITE_N) throw new Error(`Los valores deben ser como maximo ${LIMITE_N}.`);
  const necesitaRmenorN = tipo === 'permutacion' || tipo === 'combinacion';
  if (necesitaRmenorN && R > N) throw new Error('r no puede ser mayor que n (no se pueden elegir mas elementos de los que hay).');
  if (tipo === 'combinacion_repeticion' && N === 0 && R > 0) throw new Error('Con n = 0 no hay elementos para elegir.');

  const tipos = {
    permutacion: () => ({
      nombre: 'Permutacion simple P(n, r)',
      formula: 'P(n,r) = n! / (n - r)!',
      sustitucion: `P(${N},${R}) = ${N}! / (${N} - ${R})! = ${N}! / ${N - R}!`,
      valor: productoDescendente(N, R),
      ejemplo: `Formas de ordenar ${R} elementos tomados de ${N} (el orden importa, sin repetir).`,
    }),
    permutacion_repeticion: () => ({
      nombre: 'Permutacion con repeticion n^r',
      formula: 'PR = n^r',
      sustitucion: `PR = ${N}^${R}`,
      valor: BigInt(N) ** BigInt(R),
      ejemplo: `Secuencias de longitud ${R} con ${N} opciones en cada posicion (el orden importa, se puede repetir).`,
    }),
    combinacion: () => ({
      nombre: 'Combinacion C(n, r)',
      formula: 'C(n,r) = n! / (r! (n - r)!)',
      sustitucion: `C(${N},${R}) = ${N}! / (${R}! x ${N - R}!)`,
      valor: comb(N, R),
      ejemplo: `Grupos de ${R} elementos elegidos entre ${N} sin importar el orden.`,
    }),
    combinacion_repeticion: () => ({
      nombre: 'Combinacion con repeticion CR(n, r)',
      formula: 'CR(n,r) = C(n + r - 1, r) = (n + r - 1)! / (r! (n - 1)!)',
      sustitucion: `CR(${N},${R}) = C(${N + R - 1},${R}) = ${N + R - 1}! / (${R}! x ${Math.max(N - 1, 0)}!)`,
      valor: N === 0 ? 1n : comb(N + R - 1, R),
      ejemplo: `Formas de elegir ${R} elementos de ${N} tipos permitiendo repetir y sin importar el orden.`,
    }),
    factorial: () => ({
      nombre: 'Factorial n!',
      formula: 'n! = 1 x 2 x ... x n',
      sustitucion: N <= 10 ? `${N}! = ${N === 0 ? '1 (por definicion)' : Array.from({ length: N }, (_, i) => i + 1).join(' x ')}` : `${N}! = 1 x 2 x ... x ${N}`,
      valor: factorialBig(N),
      ejemplo: `Formas de ordenar ${N} elementos distintos.`,
    }),
  };
  if (!tipos[tipo]) throw new Error('Tipo de combinatoria no valido.');
  const t = tipos[tipo]();
  const exacto = t.valor.toString();
  return {
    tipo,
    nombre: t.nombre,
    formula: t.formula,
    sustitucion: t.sustitucion,
    n: N,
    r: tipo === 'factorial' ? null : R,
    valor: Number(t.valor),
    valorExacto: formatearBig(t.valor),
    digitos: exacto.length,
    ejemplo: t.ejemplo,
    pasos: [`Formula: ${t.formula}`, `Sustitucion: ${t.sustitucion}`, `Resultado: ${formatearBig(t.valor)}`],
  };
}

module.exports = { calcularCombinatoria };
