// Conexion con modelos de IA GRATUITOS mediante la API compatible con OpenAI.
// Proveedores: Groq, Google Gemini, OpenRouter (modelos :free) y Ollama (local, sin internet).
// La IA SOLO interpreta el enunciado y redacta la explicacion: los numeros los calcula
// siempre el motor de la calculadora, asi el resultado es exacto.
const fs = require('node:fs');
const path = require('node:path');

const ARCHIVO_CONFIG = path.join(__dirname, '..', '..', 'ia.config.json');

const PROVEEDORES = {
  groq: {
    nombre: 'Groq',
    url: 'https://api.groq.com/openai/v1',
    modelo: 'openai/gpt-oss-120b',
    preferidos: [/gpt-oss-120b/, /llama-3\.3-70b/, /qwen/, /gpt-oss-20b/, /llama/],
    necesitaClave: true,
    obtenerClave: 'https://console.groq.com/keys',
    jsonMode: true,
  },
  gemini: {
    nombre: 'Google Gemini',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai',
    modelo: 'gemini-2.5-flash',
    preferidos: [/gemini-[\d.]+-flash$/, /gemini-.*flash(?!.*(image|tts|audio|live))/, /gemini/],
    necesitaClave: true,
    obtenerClave: 'https://aistudio.google.com/app/apikey',
    jsonMode: true,
  },
  openrouter: {
    nombre: 'OpenRouter (modelos gratis)',
    url: 'https://openrouter.ai/api/v1',
    modelo: 'openai/gpt-oss-120b:free',
    preferidos: [/gpt-oss-120b:free/, /llama-3\.3-70b.*:free/, /deepseek.*:free/, /qwen.*:free/, /:free$/],
    necesitaClave: true,
    obtenerClave: 'https://openrouter.ai/keys',
    jsonMode: false,
  },
  ollama: {
    nombre: 'Ollama (local, sin internet)',
    url: 'http://localhost:11434/v1',
    modelo: 'llama3.2',
    preferidos: [/qwen/, /llama3/, /gemma/, /mistral/, /./],
    necesitaClave: false,
    obtenerClave: 'https://ollama.com/download',
    jsonMode: true,
  },
};

function leerConfig() {
  let archivo = {};
  try {
    archivo = JSON.parse(fs.readFileSync(ARCHIVO_CONFIG, 'utf8'));
  } catch {
    archivo = {};
  }
  const proveedor = (process.env.IA_PROVEEDOR || archivo.proveedor || '').toLowerCase();
  return {
    proveedor: PROVEEDORES[proveedor] ? proveedor : '',
    apiKey: process.env.IA_API_KEY || archivo.apiKey || '',
    modelo: process.env.IA_MODELO || archivo.modelo || '',
    url: process.env.IA_URL || archivo.url || '',
    activa: archivo.activa !== false,
  };
}

function guardarConfig({ proveedor, apiKey, modelo, url, activa }) {
  const actual = leerConfig();
  const cambiaProveedor = proveedor !== undefined && proveedor !== actual.proveedor;
  const nueva = {
    proveedor: proveedor ?? actual.proveedor,
    // si el usuario no escribe una clave nueva se conserva la anterior
    apiKey: apiKey === undefined || apiKey === '' ? (proveedor && proveedor !== actual.proveedor ? '' : actual.apiKey) : String(apiKey).trim(),
    modelo: modelo ?? (cambiaProveedor ? '' : actual.modelo),
    url: url ?? (cambiaProveedor ? '' : actual.url),
    activa: activa ?? actual.activa,
  };
  if (nueva.proveedor && !PROVEEDORES[nueva.proveedor]) throw new Error('Proveedor de IA no valido.');
  fs.writeFileSync(ARCHIVO_CONFIG, JSON.stringify(nueva, null, 2));
  modeloDescubierto = null;
  return estado();
}

let modeloDescubierto = null;

function configEfectiva() {
  const c = leerConfig();
  if (!c.proveedor || !c.activa) return null;
  const p = PROVEEDORES[c.proveedor];
  if (p.necesitaClave && !c.apiKey) return null;
  return {
    ...c,
    p,
    url: (c.url || p.url).replace(/\/$/, ''),
    modelo: c.modelo || modeloDescubierto || p.modelo,
  };
}

function estado() {
  const c = leerConfig();
  const efectiva = configEfectiva();
  return {
    disponible: !!efectiva,
    activa: c.activa,
    proveedor: c.proveedor,
    nombreProveedor: c.proveedor ? PROVEEDORES[c.proveedor].nombre : null,
    modelo: efectiva ? efectiva.modelo : c.modelo || null,
    tieneClave: !!c.apiKey,
    claveOculta: c.apiKey ? `${c.apiKey.slice(0, 4)}…${c.apiKey.slice(-4)}` : '',
    proveedores: Object.entries(PROVEEDORES).map(([id, p]) => ({
      id,
      nombre: p.nombre,
      modeloPorDefecto: p.modelo,
      necesitaClave: p.necesitaClave,
      obtenerClave: p.obtenerClave,
    })),
  };
}

class ErrorIA extends Error {
  constructor(mensaje, status) {
    super(mensaje);
    this.status = status;
  }
}

async function peticion(cfg, ruta, cuerpo, timeoutMs = 60000) {
  const controlador = new AbortController();
  const temporizador = setTimeout(() => controlador.abort(), timeoutMs);
  const headers = { 'Content-Type': 'application/json' };
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;
  if (cfg.proveedor === 'openrouter') {
    headers['HTTP-Referer'] = 'http://localhost:5173';
    headers['X-Title'] = 'Calculadora de Estadistica';
  }
  try {
    const res = await fetch(`${cfg.url}${ruta}`, {
      method: cuerpo ? 'POST' : 'GET',
      headers,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      signal: controlador.signal,
    });
    const texto = await res.text();
    let json = null;
    try {
      json = JSON.parse(texto);
    } catch {
      json = null;
    }
    if (!res.ok) {
      const msg = json?.error?.message || json?.message || json?.[0]?.error?.message || texto.slice(0, 200);
      throw new ErrorIA(`${PROVEEDORES[cfg.proveedor].nombre} respondio ${res.status}: ${msg}`, res.status);
    }
    return json;
  } catch (err) {
    if (err.name === 'AbortError') throw new ErrorIA('La IA tardo demasiado en responder.', 408);
    if (err instanceof ErrorIA) throw err;
    throw new ErrorIA(
      cfg.proveedor === 'ollama'
        ? 'No se pudo conectar con Ollama. ¿Esta instalado y abierto? (ollama serve)'
        : `No se pudo conectar con ${PROVEEDORES[cfg.proveedor].nombre}: ${err.message}. Revisa tu conexion a internet.`,
      0,
    );
  } finally {
    clearTimeout(temporizador);
  }
}

async function listarModelos(cfg) {
  const r = await peticion(cfg, '/models', null, 20000);
  const lista = (r?.data || r?.models || []).map((m) => String(m.id || m.name || '').replace(/^models\//, '')).filter(Boolean);
  return lista;
}

async function descubrirModelo(cfg) {
  const lista = await listarModelos(cfg);
  for (const re of cfg.p.preferidos) {
    const m = lista.find((id) => re.test(id));
    if (m) return m;
  }
  if (lista.length) return lista[0];
  throw new ErrorIA('No se encontro ningun modelo disponible para este proveedor.', 404);
}

function extraerJSON(texto) {
  if (!texto) throw new Error('La IA no devolvio texto.');
  const limpio = String(texto).replace(/```(?:json)?/gi, '').trim();
  try {
    return JSON.parse(limpio);
  } catch {
    const ini = limpio.indexOf('{');
    const fin = limpio.lastIndexOf('}');
    if (ini !== -1 && fin > ini) return JSON.parse(limpio.slice(ini, fin + 1));
    throw new Error('La IA no devolvio un JSON valido.');
  }
}

// Envia mensajes al modelo. Reintenta sin modo JSON o con otro modelo si hace falta.
async function chat(mensajes, { json = false, maxTokens = 3000, temperatura = 0.2 } = {}) {
  const cfg = configEfectiva();
  if (!cfg) throw new ErrorIA('La IA en linea no esta configurada.', 0);

  const cuerpo = (modelo, usarJson) => {
    const b = { model: modelo, messages: mensajes, temperature: temperatura, max_tokens: maxTokens };
    if (usarJson) b.response_format = { type: 'json_object' };
    if (cfg.proveedor === 'groq' && /gpt-oss/.test(modelo)) b.reasoning_effort = 'low';
    return b;
  };

  let modelo = cfg.modelo;
  let usarJson = json && cfg.p.jsonMode;
  for (let intento = 0; intento < 3; intento++) {
    try {
      const r = await peticion(cfg, '/chat/completions', cuerpo(modelo, usarJson));
      const contenido = r?.choices?.[0]?.message?.content;
      if (!contenido) throw new ErrorIA('La IA devolvio una respuesta vacia.', 500);
      return { texto: contenido, modelo };
    } catch (err) {
      const msg = String(err.message).toLowerCase();
      if (err.status === 401 || err.status === 403) throw new ErrorIA('La clave de API no es valida o no tiene permiso. Revisala en Configurar IA.', err.status);
      if (err.status === 429) throw new ErrorIA('Se alcanzo el limite gratuito de la IA por ahora. Espera un minuto o usa el analizador local.', 429);
      if (usarJson && (err.status === 400 || err.status === 422) && /response_format|json/.test(msg)) {
        usarJson = false;
        continue;
      }
      if ((err.status === 404 || err.status === 400) && /model|not found|decommission|does not exist|no endpoints/.test(msg) && intento < 2) {
        modelo = await descubrirModelo(cfg);
        modeloDescubierto = modelo;
        continue;
      }
      throw err;
    }
  }
  throw new ErrorIA('No se pudo obtener respuesta de la IA.', 500);
}

async function chatJSON(mensajes, opciones = {}) {
  const r = await chat(mensajes, { ...opciones, json: true });
  try {
    return { datos: extraerJSON(r.texto), modelo: r.modelo };
  } catch {
    // segundo intento pidiendo explicitamente solo JSON
    const r2 = await chat([...mensajes, { role: 'assistant', content: r.texto }, { role: 'user', content: 'Responde UNICAMENTE con el objeto JSON valido, sin texto adicional.' }], { ...opciones, json: true });
    return { datos: extraerJSON(r2.texto), modelo: r2.modelo };
  }
}

async function probar() {
  const cfg = configEfectiva();
  if (!cfg) throw new Error('Primero elige un proveedor y escribe tu clave de API.');
  const r = await chat([{ role: 'user', content: 'Responde solo con la palabra: listo' }], { maxTokens: 300 });
  return { ok: true, modelo: r.modelo, respuesta: r.texto.trim().slice(0, 60) };
}

module.exports = { estado, guardarConfig, chat, chatJSON, probar, configEfectiva, PROVEEDORES, ErrorIA };
