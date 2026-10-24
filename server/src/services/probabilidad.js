const { round } = require('../util/numeros');

function validarP(v, nombre) {
  const p = Number(v);
  if (Number.isNaN(p) || p < 0 || p > 1) throw new Error(`${nombre} debe estar entre 0 y 1.`);
  return p;
}

// Comprueba que P(A y B) sea coherente con P(A) y P(B)
function validarConjunta(pa, pb, pab) {
  const eps = 1e-9;
  if (pab > Math.min(pa, pb) + eps) {
    throw new Error(`P(A y B) = ${pab} no puede ser mayor que P(A) ni que P(B) (minimo = ${round(Math.min(pa, pb))}).`);
  }
  if (pa + pb - pab > 1 + eps) {
    throw new Error(`Los datos no son coherentes: P(A) + P(B) - P(A y B) = ${round(pa + pb - pab)} es mayor que 1.`);
  }
}

function enteroNoNegativo(v, nombre) {
  const n = Number(v);
  if (v === '' || v === undefined || v === null || !Number.isInteger(n) || n < 0) throw new Error(`${nombre} debe ser un entero >= 0.`);
  return n;
}

function numero(v, nombre) {
  const n = Number(v);
  if (v === '' || v === undefined || v === null || !Number.isFinite(n)) throw new Error(`Falta ${nombre} o no es un numero valido.`);
  return n;
}

function combBig(n, k) {
  if (k < 0 || k > n) return 0;
  k = Math.min(k, n - k);
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

// Funcion de error (Abramowitz-Stegun 7.1.26 mejorada con serie para precision ~1e-12)
function erf(x) {
  const signo = x < 0 ? -1 : 1;
  x = Math.abs(x);
  if (x < 3) {
    let suma = x;
    let termino = x;
    for (let n = 1; n < 200; n++) {
      termino *= (-x * x) / n;
      const t = termino / (2 * n + 1);
      suma += t;
      if (Math.abs(t) < 1e-16) break;
    }
    return signo * (2 / Math.sqrt(Math.PI)) * suma;
  }
  // fraccion continua para la cola
  let f = 0;
  for (let n = 60; n >= 1; n--) f = (n / 2) / (x + f);
  const erfc = Math.exp(-x * x) / Math.sqrt(Math.PI) / (x + f);
  return signo * (1 - erfc);
}

const phi = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

function normalizarHipotesis(hipotesis) {
  if (!Array.isArray(hipotesis) || hipotesis.length < 2) {
    throw new Error('Debes ingresar al menos dos hipotesis con su probabilidad previa.');
  }
  const lista = hipotesis.map((h, i) => ({
    nombre: h.nombre || `H${i + 1}`,
    priori: validarP(h.priori, `Probabilidad previa de ${h.nombre || 'H' + (i + 1)}`),
    verosimilitud: validarP(h.verosimilitud, `P(E|${h.nombre || 'H' + (i + 1)})`),
  }));
  const suma = lista.reduce((a, h) => a + h.priori, 0);
  if (Math.abs(suma - 1) > 1e-6) {
    throw new Error(`Las probabilidades previas deben sumar 1 (suma actual: ${round(suma)}).`);
  }
  return lista;
}

function calcularProbabilidad({ tipo, ...datos }) {
  switch (tipo) {
    case 'complemento': {
      const pa = validarP(datos.p, 'La probabilidad');
      return {
        tipo,
        nombre: 'Probabilidad del complemento',
        formula: "P(A') = 1 - P(A)",
        resultado: round(1 - pa),
        pasos: [`1 - ${round(pa)} = ${round(1 - pa)}`],
        notas: 'La probabilidad de que A no ocurra.',
      };
    }
    case 'union': {
      const pa = validarP(datos.pa, 'P(A)');
      const pb = validarP(datos.pb, 'P(B)');
      if (datos.pab !== undefined && datos.pab !== '') {
        const pab = validarP(datos.pab, 'P(A y B)');
        validarConjunta(pa, pb, pab);
        return {
          tipo,
          nombre: 'Union de eventos P(A u B)',
          formula: 'P(A u B) = P(A) + P(B) - P(A y B)',
          resultado: round(pa + pb - pab),
          pasos: [`${round(pa)} + ${round(pb)} - ${round(pab)} = ${round(pa + pb - pab)}`],
          independencia: Math.abs(pab - pa * pb) < 1e-9 ? 'A y B son independientes.' : 'A y B no son independientes.',
          notas: 'Incluye la interseccion una sola vez (principio de inclusion-exclusion).',
        };
      }
      const pab = pa * pb;
      return {
        tipo,
        nombre: 'Union de eventos (independientes)',
        formula: 'P(A u B) = P(A) + P(B) - P(A)P(B)',
        resultado: round(pa + pb - pab),
        pasos: [
          `P(A y B) = ${round(pa)} x ${round(pb)} = ${round(pab)}`,
          `${round(pa)} + ${round(pb)} - ${round(pab)} = ${round(pa + pb - pab)}`,
        ],
        independencia: 'Se asumio independencia entre A y B.',
        notas: 'Si conoces P(A y B) exacta, usa la variacion con tres datos.',
      };
    }
    case 'interseccion': {
      const pa = validarP(datos.pa, 'P(A)');
      const pb = validarP(datos.pb, 'P(B)');
      const pab = datos.independiente ? pa * pb : validarP(datos.pab, 'P(A y B)');
      if (!datos.independiente) validarConjunta(pa, pb, pab);
      return {
        tipo,
        nombre: 'Interseccion de eventos P(A y B)',
        formula: datos.independiente ? 'P(A y B) = P(A) x P(B)' : 'P(A y B) proporcionado',
        resultado: round(pab),
        pasos: datos.independiente
          ? [`${round(pa)} x ${round(pb)} = ${round(pab)}`]
          : [`Se uso el valor P(A y B) = ${round(pab)}`],
        notas: datos.independiente
          ? 'Los eventos son independientes, por lo que la probabilidad conjunta es el producto.'
          : 'Para eventos dependientes se necesita la probabilidad condicional.',
      };
    }
    case 'condicional': {
      if (datos.pab !== undefined && datos.pab !== '' && datos.pb !== undefined && datos.pb !== '') {
        const pab = validarP(datos.pab, 'P(A y B)');
        const pb = validarP(datos.pb, 'P(B)');
        if (pb === 0) throw new Error('P(B) no puede ser 0 (division entre cero).');
        if (pab > pb + 1e-9) throw new Error('P(A y B) no puede ser mayor que P(B).');
        return {
          tipo,
          nombre: 'Probabilidad condicional P(A|B)',
          formula: 'P(A|B) = P(A y B) / P(B)',
          resultado: round(pab / pb),
          pasos: [`${round(pab)} / ${round(pb)} = ${round(pab / pb)}`],
          notas: 'Probabilidad de A sabiendo que B ocurrio.',
        };
      }
      const pa = validarP(datos.pa, 'P(A)');
      const pb = validarP(datos.pb, 'P(B)');
      const pab = validarP(datos.pab, 'P(A y B)');
      if (pb === 0 || pa === 0) throw new Error('P(A) y P(B) no pueden ser 0 (division entre cero).');
      validarConjunta(pa, pb, pab);
      const pba = pab / pa;
      return {
        tipo,
        nombre: 'Probabilidad condicional de ambos sentidos',
        formula: 'P(A|B) = P(A y B)/P(B) y P(B|A) = P(A y B)/P(A)',
        resultado: round(pab / pb),
        resultadoInverso: round(pba),
        pasos: [
          `P(A|B) = ${round(pab)} / ${round(pb)} = ${round(pab / pb)}`,
          `P(B|A) = ${round(pab)} / ${round(pa)} = ${round(pba)}`,
        ],
        notas: 'La condicional NO es simetrica: P(A|B) != P(B|A) en general.',
      };
    }
    case 'bayes': {
      const hip = normalizarHipotesis(datos.hipotesis);
      const total = hip.reduce((acc, h) => acc + h.priori * h.verosimilitud, 0);
      if (total === 0) throw new Error('La probabilidad total de la evidencia es 0.');
      const posteriores = hip.map((h) => ({
        nombre: h.nombre,
        priori: round(h.priori),
        verosimilitud: round(h.verosimilitud),
        verosimilitudPorPriori: round(h.priori * h.verosimilitud),
        posterior: round((h.priori * h.verosimilitud) / total),
        porcentaje: round(((h.priori * h.verosimilitud) / total) * 100, 2),
      }));
      const masProbable = posteriores.reduce((a, b) => (b.posterior > a.posterior ? b : a));
      return {
        tipo,
        nombre: 'Teorema de Bayes',
        formula: 'P(Hi|E) = [P(Hi) x P(E|Hi)] / P(E)',
        probabilidadTotal: round(total),
        resultado: round(masProbable.posterior),
        conclusion: `La hipotesis mas probable es "${masProbable.nombre}" con ${masProbable.porcentaje}%.`,
        posteriores,
        pasos: posteriores.map(
          (h) => `${h.nombre}: (${h.priori} x ${h.verosimilitud}) / ${round(total)} = ${h.posterior}`,
        ),
        notas: 'P(E) = suma de P(Hi) x P(E|Hi) (probabilidad total).',
      };
    }
    case 'independencia': {
      const pa = validarP(datos.pa, 'P(A)');
      const pb = validarP(datos.pb, 'P(B)');
      const pab = validarP(datos.pab, 'P(A y B)');
      validarConjunta(pa, pb, pab);
      const producto = pa * pb;
      const esIndependiente = Math.abs(pab - producto) < 1e-6;
      return {
        tipo,
        nombre: 'Prueba de independencia',
        formula: 'A y B son independientes si P(A y B) = P(A) x P(B)',
        resultado: round(producto),
        esIndependiente,
        pasos: [
          `P(A) x P(B) = ${round(pa)} x ${round(pb)} = ${round(producto)}`,
          `P(A y B) = ${round(pab)}`,
          esIndependiente
            ? `${round(pab)} = ${round(producto)} => independientes`
            : `${round(pab)} != ${round(producto)} => dependientes`,
        ],
        notas: esIndependiente
          ? 'Los eventos son independientes.'
          : 'Los eventos estan relacionados (dependientes).',
      };
    }
    case 'probabilidad_total': {
      const hip = normalizarHipotesis(datos.hipotesis);
      const total = hip.reduce((acc, h) => acc + h.priori * h.verosimilitud, 0);
      return {
        tipo,
        nombre: 'Ley de la probabilidad total',
        formula: 'P(E) = SUMA P(Hi) x P(E|Hi)',
        resultado: round(total),
        componentes: hip.map((h) => ({
          nombre: h.nombre,
          aporte: round(h.priori * h.verosimilitud),
        })),
        pasos: hip.map((h) => `${h.nombre}: ${round(h.priori)} x ${round(h.verosimilitud)} = ${round(h.priori * h.verosimilitud)}`),
        notas: `Suma total = ${round(total)}`,
      };
    }
    case 'laplace': {
      const fav = numero(datos.favorables, 'el numero de casos favorables');
      const pos = numero(datos.posibles, 'el numero de casos posibles');
      if (pos <= 0) throw new Error('Los casos posibles deben ser mayores que 0.');
      if (fav < 0 || fav > pos) throw new Error('Los casos favorables deben estar entre 0 y los casos posibles.');
      const p = fav / pos;
      return {
        tipo,
        nombre: 'Probabilidad clasica (regla de Laplace)',
        formula: 'P(A) = casos favorables / casos posibles',
        resultado: round(p),
        porcentaje: round(p * 100, 2),
        pasos: [`P(A) = ${fav} / ${pos} = ${round(p)}`, `En porcentaje: ${round(p * 100, 2)}%`],
        notas: 'Solo es valida si todos los resultados son igualmente probables.',
      };
    }
    case 'binomial': {
      const n = enteroNoNegativo(datos.n, 'n (numero de ensayos)');
      const p = validarP(datos.p, 'p (probabilidad de exito)');
      const k = enteroNoNegativo(datos.k, 'k (numero de exitos)');
      if (n > 1000) throw new Error('n debe ser como maximo 1000.');
      if (k > n) throw new Error('k no puede ser mayor que n.');
      const pmf = (x) => combBig(n, x) * p ** x * (1 - p) ** (n - x);
      const exacta = pmf(k);
      let acumulada = 0;
      for (let x = 0; x <= k; x++) acumulada += pmf(x);
      const distribucion = [];
      for (let x = 0; x <= Math.min(n, 60); x++) distribucion.push({ x, p: round(pmf(x)) });
      return {
        tipo,
        nombre: 'Distribucion binomial',
        formula: 'P(X = k) = C(n,k) · p^k · (1 - p)^(n - k)',
        resultado: round(exacta),
        acumuladaMenorIgual: round(acumulada),
        acumuladaMayorIgual: round(1 - acumulada + exacta),
        media: round(n * p),
        varianza: round(n * p * (1 - p)),
        desviacion: round(Math.sqrt(n * p * (1 - p))),
        distribucion,
        pasos: [
          `C(${n},${k}) = ${combBig(n, k)}`,
          `P(X = ${k}) = ${combBig(n, k)} x ${p}^${k} x ${round(1 - p)}^${n - k} = ${round(exacta)}`,
          `P(X <= ${k}) = ${round(acumulada)};  P(X >= ${k}) = ${round(1 - acumulada + exacta)}`,
          `Media = n·p = ${round(n * p)};  Varianza = n·p·(1 - p) = ${round(n * p * (1 - p))}`,
        ],
        notas: 'n ensayos independientes, cada uno con probabilidad de exito p.',
      };
    }
    case 'poisson': {
      const lambda = numero(datos.lambda, 'λ (promedio de ocurrencias)');
      const k = enteroNoNegativo(datos.k, 'k (numero de ocurrencias)');
      if (lambda <= 0) throw new Error('λ debe ser mayor que 0.');
      if (k > 1000) throw new Error('k debe ser como maximo 1000.');
      const pmf = (x) => {
        let v = Math.exp(-lambda);
        for (let i = 1; i <= x; i++) v *= lambda / i;
        return v;
      };
      let acumulada = 0;
      for (let x = 0; x <= k; x++) acumulada += pmf(x);
      const exacta = pmf(k);
      const distribucion = [];
      const tope = Math.max(k, Math.ceil(lambda + 4 * Math.sqrt(lambda)));
      for (let x = 0; x <= Math.min(tope, 60); x++) distribucion.push({ x, p: round(pmf(x)) });
      return {
        tipo,
        nombre: 'Distribucion de Poisson',
        formula: 'P(X = k) = e^(-λ) · λ^k / k!',
        resultado: round(exacta),
        acumuladaMenorIgual: round(acumulada),
        acumuladaMayorIgual: round(1 - acumulada + exacta),
        media: round(lambda),
        varianza: round(lambda),
        distribucion,
        pasos: [
          `P(X = ${k}) = e^(-${lambda}) x ${lambda}^${k} / ${k}! = ${round(exacta)}`,
          `P(X <= ${k}) = ${round(acumulada)};  P(X >= ${k}) = ${round(1 - acumulada + exacta)}`,
        ],
        notas: 'Media = varianza = λ.',
      };
    }
    case 'normal': {
      const mu = numero(datos.media, 'la media μ');
      const sigma = numero(datos.desviacion, 'la desviacion σ');
      if (sigma <= 0) throw new Error('La desviacion estandar debe ser mayor que 0.');
      const tieneA = datos.a !== undefined && datos.a !== '' && datos.a !== null;
      const tieneB = datos.b !== undefined && datos.b !== '' && datos.b !== null;
      if (!tieneA && !tieneB) throw new Error('Indica al menos un limite: a (desde) y/o b (hasta).');
      const a = tieneA ? numero(datos.a, 'a') : -Infinity;
      const b = tieneB ? numero(datos.b, 'b') : Infinity;
      if (a > b) throw new Error('El limite a debe ser menor o igual que b.');
      const za = tieneA ? (a - mu) / sigma : -Infinity;
      const zb = tieneB ? (b - mu) / sigma : Infinity;
      const pa = tieneA ? phi(za) : 0;
      const pb = tieneB ? phi(zb) : 1;
      const p = pb - pa;
      const texto = tieneA && tieneB ? `P(${a} <= X <= ${b})` : tieneA ? `P(X >= ${a})` : `P(X <= ${b})`;
      const pasos = [];
      if (tieneA) pasos.push(`z(a) = (${a} - ${mu}) / ${sigma} = ${round(za, 4)}  ->  Φ(${round(za, 4)}) = ${round(pa)}`);
      if (tieneB) pasos.push(`z(b) = (${b} - ${mu}) / ${sigma} = ${round(zb, 4)}  ->  Φ(${round(zb, 4)}) = ${round(pb)}`);
      pasos.push(tieneA && tieneB ? `${texto} = ${round(pb)} - ${round(pa)} = ${round(p)}` : tieneA ? `${texto} = 1 - ${round(pa)} = ${round(p)}` : `${texto} = ${round(p)}`);
      return {
        tipo,
        nombre: 'Distribucion normal',
        formula: 'z = (x - μ) / σ ;  P = Φ(z_b) - Φ(z_a)',
        resultado: round(p),
        porcentaje: round(p * 100, 2),
        expresion: texto,
        z: { a: tieneA ? round(za, 4) : null, b: tieneB ? round(zb, 4) : null },
        parametros: { media: mu, desviacion: sigma, a: tieneA ? a : null, b: tieneB ? b : null },
        pasos,
        notas: 'Φ(z) es el area bajo la normal estandar a la izquierda de z (tabla Z).',
      };
    }
    default:
      throw new Error('Tipo de calculo de probabilidad no valido.');
  }
}

module.exports = { calcularProbabilidad, phi };
