// Resuelve problemas con IA en 3 pasos:
//   1) la IA lee el enunciado y lo convierte en operaciones (JSON)
//   2) el motor de la calculadora hace TODOS los calculos (exactos)
//   3) la IA redacta la respuesta y el desarrollo paso a paso usando esos resultados
const ia = require('./ia');
const { analizarDatos } = require('./analisisDatos');
const { calcularCombinatoria } = require('./combinatoria');
const { calcularProbabilidad } = require('./probabilidad');
const { calcularDesdeTablaAgrupada } = require('./frecuencias');
const { evaluar } = require('../util/expresion');
const { round } = require('../util/numeros');

const PROMPT_INTERPRETAR = `Eres un profesor de estadistica y probabilidad. Lee el problema del estudiante (en español) y conviertelo en operaciones que una calculadora ejecutara. NO hagas calculos tu mismo: solo describe que hay que calcular.

Responde SOLO con un objeto JSON con esta forma:
{
  "tema": "descriptiva | frecuencias | combinatoria | probabilidad | distribuciones | mixto | otro",
  "resumen": "que pide el problema, en una frase",
  "datos": [lista de datos crudos si el problema trae una lista de observaciones (numeros o palabras), si no null],
  "tablaValores": [{"valor": 3, "frecuencia": 5}] o null   (si da una tabla de valores sueltos con su frecuencia),
  "tablaAgrupada": [{"inicio": 10, "fin": 20, "frecuencia": 4}] o null   (si da una tabla con intervalos/clases),
  "tipoDatos": "muestra" o "poblacion"  (muestra por defecto),
  "numClases": null o un entero si el problema indica cuantas clases usar,
  "operaciones": [ ... ],
  "faltan": null o "texto explicando que dato falta para resolverlo"
}

Tipos de operacion permitidos (usa los que necesites, en orden):
- {"id":"op1","descripcion":"...","tipo":"descriptiva","medidas":["media","mediana","moda","varianza","desviacion","rango","cv","cuartiles","percentiles"]}  -> usa "datos"/"tablaValores"
- {"id":"op2","descripcion":"...","tipo":"frecuencias"}  -> tabla de frecuencias de "datos" o "tablaAgrupada"
- {"id":"op3","descripcion":"...","tipo":"combinatoria","subtipo":"permutacion|combinacion|permutacion_repeticion|combinacion_repeticion|factorial","n":10,"r":3}
- {"id":"op4","descripcion":"...","tipo":"probabilidad","subtipo":"complemento","p":0.3}
- {"tipo":"probabilidad","subtipo":"union|interseccion|condicional|independencia","pa":0.3,"pb":0.4,"pab":0.12}   (en interseccion puedes poner "independiente": true)
- {"tipo":"probabilidad","subtipo":"bayes|probabilidad_total","hipotesis":[{"nombre":"H1","priori":0.6,"verosimilitud":0.1}, ...]}
- {"tipo":"probabilidad","subtipo":"laplace","favorables":3,"posibles":6}
- {"tipo":"probabilidad","subtipo":"binomial","n":10,"p":0.5,"k":3}
- {"tipo":"probabilidad","subtipo":"poisson","lambda":2.5,"k":4}
- {"tipo":"probabilidad","subtipo":"normal","media":70,"desviacion":10,"a":60,"b":80}   (omite a o b para colas: P(X<=b) o P(X>=a))
- {"id":"op9","descripcion":"...","tipo":"expresion","expresion":"(5/8)*(4/7)"}  -> para cualquier otra cuenta. Se permite + - * / ^ ( ), C(n,r), P(n,r), n!, sqrt(), exp(), ln(), pi. Usa fracciones exactas.

Reglas:
- Convierte porcentajes a probabilidades (30% -> 0.3) en las operaciones de probabilidad.
- Para extracciones sin reemplazo, varios pasos o "al menos uno", usa "expresion" (p. ej. "1-(5/6)^4").
- Si el problema pregunta varias cosas, crea una operacion para cada una.
- Copia los datos tal como aparecen. No inventes datos. Si falta algo imprescindible, explicalo en "faltan".`;

const PROMPT_EXPLICAR = `Eres un profesor de estadistica que explica en español claro a un estudiante universitario.
Recibiras el problema y los RESULTADOS EXACTOS que calculo la calculadora. Usa SOLO esos numeros (no recalcules ni inventes valores; puedes redondear a 4 decimales).

Responde SOLO con un objeto JSON:
{
  "respuesta": "respuesta final directa a lo que se pregunta, con los valores y unidades (1 a 3 frases)",
  "pasos": [ {"titulo": "nombre corto del paso", "formula": "formula usada (texto plano, usa x̄, σ, Σ, √, ^)", "detalle": "sustitucion de valores y resultado"} ],
  "conclusion": "interpretacion breve del resultado en el contexto del problema (1 a 2 frases)"
}
Escribe entre 3 y 8 pasos ordenados. Si alguna operacion tuvo error, explica que dato hay que corregir.`;

function aNumero(v) {
  if (typeof v === 'number') return v;
  const n = Number(String(v).replace(',', '.').replace('%', ''));
  return Number.isFinite(n) ? n : v;
}

function prepararDatos(plan) {
  if (Array.isArray(plan.tablaValores) && plan.tablaValores.length) {
    const lista = [];
    for (const fila of plan.tablaValores) {
      const f = Math.round(Number(fila.frecuencia));
      if (!Number.isFinite(f) || f < 0 || f > 100000) continue;
      for (let i = 0; i < f; i++) lista.push(aNumero(fila.valor));
    }
    if (lista.length) return lista;
  }
  if (Array.isArray(plan.datos) && plan.datos.length) return plan.datos.map(aNumero);
  return null;
}

// Resumen compacto de un resultado para enviarlo a la IA (sin tablas enormes)
function compactar(op, r) {
  if (!r) return null;
  if (op.tipo === 'descriptiva' || op.tipo === 'frecuencias') {
    if (r.modo === 'cualitativas') {
      const fq = r.frecuencias;
      return { n: fq.n, moda: fq.resumen.moda, tabla: fq.tabla.slice(0, 15).map((c) => ({ categoria: c.categoria, fi: c.fa, porcentaje: c.frPorcentaje })) };
    }
    if (r.tablaAgrupada) {
      return { tablaAgrupada: r.tablaAgrupada.tabla.map((c) => ({ intervalo: c.intervalo, xi: c.marca, fi: c.fa, Fi: c.faAcum, xifi: c.xf })), ...r.tablaAgrupada.resumen, n: r.tablaAgrupada.n, totales: r.tablaAgrupada.totales };
    }
    const d = r.descriptiva;
    const base = {
      n: d.n, suma: d.suma, media: d.media, mediana: d.mediana, modas: d.modas, tipoModa: d.tipoModa,
      min: d.min, max: d.max, rango: d.rango, sumaCuadradosDesviaciones: round(d.varianzaPoblacional * d.n),
      varianza: d.varianza, desviacion: d.desviacionEstandar, tipo: d.tipo, cv: d.coefVariacion,
      q1: d.q1, q3: d.q3, ric: d.rangoIntercuartilico, percentiles: d.percentiles,
      asimetria: d.sesgo, curtosis: d.curtosis, datosOrdenados: d.datosOrdenados.slice(0, 60),
    };
    if (op.tipo === 'frecuencias' && r.frecuencias) {
      base.tablaFrecuencias = r.frecuencias.tabla.map((c) => ({ intervalo: c.intervalo, xi: c.marca, fi: c.fa, Fi: c.faAcum, hi: c.fr }));
      base.agrupados = r.frecuencias.resumen;
      base.numClases = r.frecuencias.numClases;
      base.amplitud = r.frecuencias.amplitud;
    }
    return base;
  }
  const { distribucion, ...resto } = r; // quitar listas largas
  return resto;
}

function ejecutarOperaciones(plan) {
  const datos = prepararDatos(plan);
  const tipoDatos = plan.tipoDatos === 'poblacion' ? 'poblacion' : 'muestra';
  let analisis = null;
  let tablaAgrupada = null;
  const resultados = [];

  if (datos && datos.length) {
    try {
      analisis = analizarDatos(datos, { tipo: tipoDatos, numClases: plan.numClases || undefined });
    } catch (err) {
      resultados.push({ id: 'datos', descripcion: 'Analisis de los datos', tipo: 'datos', ok: false, error: err.message });
    }
  }
  if (Array.isArray(plan.tablaAgrupada) && plan.tablaAgrupada.length) {
    try {
      tablaAgrupada = calcularDesdeTablaAgrupada(plan.tablaAgrupada, tipoDatos);
    } catch (err) {
      resultados.push({ id: 'tabla', descripcion: 'Tabla agrupada', tipo: 'frecuencias', ok: false, error: err.message });
    }
  }

  const ops = Array.isArray(plan.operaciones) ? plan.operaciones.slice(0, 12) : [];
  ops.forEach((op, i) => {
    const id = op.id || `op${i + 1}`;
    const descripcion = op.descripcion || op.tipo;
    try {
      let r;
      switch (op.tipo) {
        case 'descriptiva':
        case 'frecuencias':
          if (tablaAgrupada) r = { tablaAgrupada };
          else if (analisis) r = analisis;
          else throw new Error('No se encontraron los datos para esta operacion.');
          break;
        case 'combinatoria':
          r = calcularCombinatoria({ tipo: op.subtipo, n: op.n, r: op.r });
          break;
        case 'probabilidad': {
          const { tipo: _t, subtipo, id: _i, descripcion: _d, ...params } = op;
          r = calcularProbabilidad({ tipo: subtipo, ...params });
          break;
        }
        case 'expresion': {
          const v = evaluar(op.expresion);
          r = { expresion: op.expresion, valor: round(v, 10), porcentaje: v >= 0 && v <= 1 ? round(v * 100, 4) : undefined };
          break;
        }
        default:
          throw new Error(`Operacion desconocida: ${op.tipo}`);
      }
      resultados.push({ id, descripcion, tipo: op.tipo, subtipo: op.subtipo, ok: true, resultado: r });
    } catch (err) {
      resultados.push({ id, descripcion, tipo: op.tipo, subtipo: op.subtipo, ok: false, error: err.message, entrada: op });
    }
  });

  return { datos, analisis, tablaAgrupada, resultados };
}

function vistaPrincipal(ejec) {
  if (ejec.analisis) return 'datos';
  if (ejec.tablaAgrupada) return 'tablaAgrupada';
  return 'operaciones';
}

function sugerencias(plan, ejec) {
  if (ejec.analisis?.modo === 'cuantitativas') return ['¿Qué significa la desviación estándar aquí?', '¿Hay datos atípicos?', '¿Cuál es el coeficiente de variación?', '¿Cómo interpreto el sesgo?'];
  if (ejec.analisis?.modo === 'cualitativas') return ['¿Cuál es la categoría más frecuente?', '¿Qué porcentaje representa cada una?'];
  if (plan.tema === 'combinatoria') return ['¿Por qué se usa esa fórmula?', '¿Y si importara el orden?', '¿Y con repetición?'];
  return ['¿Por qué se usa esa fórmula?', 'Explícamelo más sencillo', '¿Cómo lo resuelvo a mano?'];
}

async function resolverConIA(texto) {
  const { datos: plan, modelo } = await ia.chatJSON(
    [
      { role: 'system', content: PROMPT_INTERPRETAR },
      { role: 'user', content: String(texto).slice(0, 6000) },
    ],
    { maxTokens: 4000, temperatura: 0.1 },
  );

  const ejec = ejecutarOperaciones(plan || {});
  const hayResultados = ejec.resultados.some((r) => r.ok) || ejec.analisis || ejec.tablaAgrupada;
  const cfg = ia.configEfectiva();
  const base = {
    motor: 'ia',
    proveedor: cfg?.p?.nombre,
    modelo,
    tema: plan.tema || null,
    conceptos: [plan.tema].filter(Boolean),
    pregunta: plan.resumen || null,
    plan,
    datosDetectados: ejec.datos ? ejec.datos.slice(0, 200) : [],
    etiquetasDetectadas: (plan.operaciones || []).map((o) => o.descripcion).filter(Boolean),
    operaciones: ejec.resultados,
    analisisDatos: ejec.analisis,
    tablaAgrupada: ejec.tablaAgrupada,
    vista: vistaPrincipal(ejec),
  };

  if (!hayResultados) {
    return {
      ...base,
      falta: plan.faltan || ejec.resultados.find((r) => !r.ok)?.error || 'No pude identificar que calcular. Revisa que el enunciado tenga todos los datos.',
      respuesta: '',
      pasos: [],
      preguntasSugeridas: [],
    };
  }

  const resumenResultados = {
    analisisDeDatos: ejec.analisis ? compactar({ tipo: 'descriptiva' }, ejec.analisis) : undefined,
    tablaAgrupada: ejec.tablaAgrupada ? compactar({ tipo: 'frecuencias' }, { tablaAgrupada: ejec.tablaAgrupada }) : undefined,
    operaciones: ejec.resultados.map((r) => ({
      id: r.id,
      descripcion: r.descripcion,
      ok: r.ok,
      resultado: r.ok ? compactar(r, r.resultado) : undefined,
      error: r.error,
    })),
  };

  const { datos: expl } = await ia.chatJSON(
    [
      { role: 'system', content: PROMPT_EXPLICAR },
      {
        role: 'user',
        content: `PROBLEMA:\n${String(texto).slice(0, 4000)}\n\nLO QUE SE PIDE: ${plan.resumen || ''}\n\nRESULTADOS DE LA CALCULADORA (JSON):\n${JSON.stringify(resumenResultados).slice(0, 12000)}`,
      },
    ],
    { maxTokens: 4000, temperatura: 0.2 },
  );

  const pasos = Array.isArray(expl.pasos)
    ? expl.pasos.map((p) => (typeof p === 'string' ? { titulo: '', formula: '', detalle: p } : { titulo: p.titulo || '', formula: p.formula || '', detalle: p.detalle || '' }))
    : [];

  return {
    ...base,
    falta: null,
    respuesta: expl.respuesta || '',
    conclusion: expl.conclusion || '',
    pasos,
    preguntasSugeridas: sugerencias(plan, ejec),
  };
}

const PROMPT_CHAT = `Eres un tutor de estadistica y probabilidad que responde en español, de forma breve y clara (maximo 6 frases o una lista corta).
Tienes el problema que el estudiante resolvio y los resultados exactos de la calculadora. Usa esos numeros.
Si necesitas una cuenta nueva, NO la hagas de cabeza: responde con JSON {"calcular": ["expresion1", ...]} usando + - * / ^ ( ), C(n,r), P(n,r), n!, sqrt(). Recibiras los valores y entonces responderas.
Si no necesitas calcular nada, responde con JSON {"respuesta": "tu respuesta"}.`;

async function conversarConIA(pregunta, contexto = {}, historial = []) {
  const mensajes = [
    { role: 'system', content: PROMPT_CHAT },
    {
      role: 'user',
      content: `CONTEXTO DEL PROBLEMA:\n${String(contexto.texto || '').slice(0, 3000)}\n\nRESPUESTA OBTENIDA: ${contexto.respuesta || ''}\n\nRESULTADOS (JSON): ${JSON.stringify(contexto.resultados || {}).slice(0, 8000)}`,
    },
    { role: 'assistant', content: '{"respuesta": "Entendido. ¿Qué quieres saber?"}' },
  ];
  for (const m of (historial || []).slice(-8)) {
    mensajes.push({ role: m.quien === 'tu' ? 'user' : 'assistant', content: m.quien === 'tu' ? m.texto : JSON.stringify({ respuesta: m.texto }) });
  }
  mensajes.push({ role: 'user', content: pregunta });

  let { datos } = await ia.chatJSON(mensajes, { maxTokens: 2500, temperatura: 0.3 });
  if (Array.isArray(datos.calcular) && datos.calcular.length && !datos.respuesta) {
    const valores = datos.calcular.slice(0, 8).map((e) => {
      try {
        return `${e} = ${round(evaluar(e), 8)}`;
      } catch (err) {
        return `${e} -> error: ${err.message}`;
      }
    });
    mensajes.push({ role: 'assistant', content: JSON.stringify(datos) });
    mensajes.push({ role: 'user', content: `Valores calculados:\n${valores.join('\n')}\nAhora responde con {"respuesta": "..."}` });
    ({ datos } = await ia.chatJSON(mensajes, { maxTokens: 2500, temperatura: 0.3 }));
  }
  return { respuesta: String(datos.respuesta || 'No pude generar una respuesta.'), motor: 'ia' };
}

module.exports = { resolverConIA, conversarConIA, ejecutarOperaciones, compactar };
