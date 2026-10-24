// Evaluador seguro de expresiones aritmeticas (sin eval).
// Soporta: + - * / ^ ( ) , numeros decimales, porcentajes (30%), y funciones:
// C(n,r) combinaciones, P(n,r) permutaciones, fact(n) o n!, sqrt, exp, ln, log, abs, pi, e.
const { factorialBig } = require('./numeros');

function tokenizar(texto) {
  const s = String(texto).replace(/×|x(?=\s*[\d(])/g, '*').replace(/÷/g, '/').replace(/,(?=\d{1,}\b)(?![^()]*\))/g, '.');
  const tokens = [];
  let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      if (s[j] === 'e' && /[-+\d]/.test(s[j + 1] || '')) { j++; if (/[-+]/.test(s[j])) j++; while (/\d/.test(s[j] || '')) j++; }
      tokens.push({ t: 'num', v: parseFloat(s.slice(i, j)) });
      i = j;
      continue;
    }
    if (/[a-zA-Zπ]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Zπ0-9_]/.test(s[j])) j++;
      tokens.push({ t: 'id', v: s.slice(i, j).toLowerCase() });
      i = j;
      continue;
    }
    if ('+-*/^(),!%'.includes(c)) { tokens.push({ t: 'op', v: c }); i++; continue; }
    throw new Error(`Caracter no permitido en la expresion: "${c}"`);
  }
  return tokens;
}

function factorialNum(n) {
  if (!Number.isInteger(n) || n < 0) throw new Error('El factorial requiere un entero >= 0.');
  if (n > 170) throw new Error('Factorial demasiado grande.');
  return Number(factorialBig(n));
}

function comb(n, r) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || n < 0) throw new Error('C(n,r) requiere enteros >= 0.');
  if (r > n) return 0;
  r = Math.min(r, n - r);
  let v = 1;
  for (let i = 1; i <= r; i++) v = (v * (n - r + i)) / i;
  return Math.round(v);
}

function perm(n, r) {
  if (!Number.isInteger(n) || !Number.isInteger(r) || r < 0 || n < 0) throw new Error('P(n,r) requiere enteros >= 0.');
  if (r > n) return 0;
  let v = 1;
  for (let i = 0; i < r; i++) v *= n - i;
  return v;
}

const FUNCIONES = {
  c: { n: 2, f: comb }, comb: { n: 2, f: comb }, ncr: { n: 2, f: comb },
  p: { n: 2, f: perm }, perm: { n: 2, f: perm }, npr: { n: 2, f: perm },
  fact: { n: 1, f: factorialNum }, factorial: { n: 1, f: factorialNum },
  sqrt: { n: 1, f: Math.sqrt }, raiz: { n: 1, f: Math.sqrt },
  exp: { n: 1, f: Math.exp }, ln: { n: 1, f: Math.log }, log: { n: 1, f: Math.log10 },
  abs: { n: 1, f: Math.abs },
};
const CONSTANTES = { pi: Math.PI, 'π': Math.PI, e: Math.E };

function evaluar(texto) {
  const tokens = tokenizar(texto);
  let pos = 0;
  const ver = () => tokens[pos];
  const tomar = (v) => {
    const tk = tokens[pos];
    if (!tk || (v && tk.v !== v)) throw new Error(`Se esperaba "${v}" en la expresion.`);
    pos++;
    return tk;
  };

  function expr() {
    let v = term();
    while (ver() && (ver().v === '+' || ver().v === '-')) {
      const op = tomar().v;
      const d = term();
      v = op === '+' ? v + d : v - d;
    }
    return v;
  }
  function term() {
    let v = unario();
    while (ver() && (ver().v === '*' || ver().v === '/' || ver().v === '(' || ver().t === 'num' || ver().t === 'id')) {
      if (ver().v === '*' || ver().v === '/') {
        const op = tomar().v;
        const d = unario();
        if (op === '/' && d === 0) throw new Error('Division entre cero.');
        v = op === '*' ? v * d : v / d;
      } else {
        v *= unario(); // multiplicacion implicita: 2(3) o 2pi
      }
    }
    return v;
  }
  function unario() {
    if (ver() && ver().v === '-') { tomar(); return -unario(); }
    if (ver() && ver().v === '+') { tomar(); return unario(); }
    return potencia();
  }
  function potencia() {
    const base = postfijo();
    if (ver() && ver().v === '^') {
      tomar();
      return base ** unario();
    }
    return base;
  }
  function postfijo() {
    let v = primario();
    while (ver() && (ver().v === '!' || ver().v === '%')) {
      const op = tomar().v;
      v = op === '!' ? factorialNum(v) : v / 100;
    }
    return v;
  }
  function primario() {
    const tk = ver();
    if (!tk) throw new Error('Expresion incompleta.');
    if (tk.t === 'num') { pos++; return tk.v; }
    if (tk.v === '(') { tomar('('); const v = expr(); tomar(')'); return v; }
    if (tk.t === 'id') {
      pos++;
      if (FUNCIONES[tk.v] && ver() && ver().v === '(') {
        tomar('(');
        const args = [expr()];
        while (ver() && ver().v === ',') { tomar(','); args.push(expr()); }
        tomar(')');
        const fn = FUNCIONES[tk.v];
        if (args.length !== fn.n) throw new Error(`${tk.v} necesita ${fn.n} argumento(s).`);
        return fn.f(...args);
      }
      if (tk.v in CONSTANTES) return CONSTANTES[tk.v];
      throw new Error(`Funcion o variable desconocida: ${tk.v}`);
    }
    throw new Error(`Simbolo inesperado: ${tk.v}`);
  }

  const v = expr();
  if (pos < tokens.length) throw new Error(`Sobra texto en la expresion cerca de "${tokens[pos].v}".`);
  if (!Number.isFinite(v)) throw new Error('El resultado no es un numero finito.');
  return v;
}

module.exports = { evaluar };
