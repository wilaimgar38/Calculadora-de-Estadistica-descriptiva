const BASE = '/api';

async function pedir(ruta, opciones = {}) {
  let res;
  try {
    res = await fetch(`${BASE}${ruta}`, {
      headers: { 'Content-Type': 'application/json' },
      ...opciones,
    });
  } catch {
    throw new Error('No hay conexion con el servidor. ¿Esta encendido el backend (puerto 4000)?');
  }
  const datos = await res.json().catch(() => ({ ok: false, error: 'No hay conexion con el servidor. ¿Esta encendido el backend (puerto 4000)?' }));
  if (!res.ok || !datos.ok) throw new Error(datos.error || 'Error en la peticion.');
  return datos;
}

const post = (ruta, body) => pedir(ruta, { method: 'POST', body: JSON.stringify(body) });

export const api = {
  datos: (data, tipo, numClases) => post('/calculos/datos', { data, tipo, numClases }),
  descriptiva: (data, tipo) => post('/calculos/descriptiva', { data, tipo }),
  frecuencias: (data, numClases, tipo) => post('/calculos/frecuencias', { data, numClases, tipo }),
  combinatoria: (body) => post('/calculos/combinatoria', body),
  probabilidad: (body) => post('/calculos/probabilidad', body),
  historial: (params = '') => pedir(`/historial${params}`),
  borrarCalculo: (id) => pedir(`/historial/${id}`, { method: 'DELETE' }),
  limpiarHistorial: () => pedir('/historial', { method: 'DELETE' }),
  conjuntos: () => pedir('/conjuntos'),
  guardarConjunto: (body) => post('/conjuntos', body),
  borrarConjunto: (id) => pedir(`/conjuntos/${id}`, { method: 'DELETE' }),
  ejemplos: () => pedir('/ejemplos'),
  ejemplosProblemas: () => pedir('/ejemplos-problemas'),
  analizar: (texto, motor) => post('/analizar', { texto, motor }),
  consulta: (pregunta, contexto, historial, motor) => post('/analizar/consulta', { pregunta, contexto, historial, motor }),
  iaEstado: () => pedir('/ia/estado'),
  iaConfig: (body) => post('/ia/config', body),
  iaProbar: () => post('/ia/probar', {}),
  salud: () => pedir('/salud'),
};
