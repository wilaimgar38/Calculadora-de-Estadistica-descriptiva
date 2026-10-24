import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Vacio, Pasos, Segmentado, Aviso } from '../components/ui.jsx';
import VisorResultados from '../components/VisorResultados.jsx';
import Operacion from '../components/Operacion.jsx';
import { fmt, leerPreferencia, guardarPreferencia } from '../util.js';

function contextoChat(texto, a) {
  const d = a.analisisDatos;
  const numeros = d?.modo === 'cuantitativas' ? d.datos : (a.datosDetectados || []).filter((x) => typeof x === 'number');
  const categorias = d?.modo === 'cualitativas' ? d.datos : [];
  const resultados = {
    medidas: d?.descriptiva
      ? (({ n, media, mediana, modas, varianza, desviacionEstandar, coefVariacion, q1, q3, rango, min, max, sesgo, curtosis, tipo, interpretacion }) => ({ n, media, mediana, modas, varianza, desviacionEstandar, coefVariacion, q1, q3, rango, min, max, sesgo, curtosis, tipo, interpretacion }))(d.descriptiva)
      : undefined,
    frecuencias: d?.frecuencias?.tabla?.map((c) => ({ clase: c.intervalo ?? c.categoria, fi: c.fa, porcentaje: c.frPorcentaje })) ?? a.tablaAgrupada?.tabla?.map((c) => ({ clase: c.intervalo, fi: c.fa })),
    agrupados: d?.frecuencias?.resumen ?? a.tablaAgrupada?.resumen,
    operaciones: (a.operaciones || []).filter((o) => o.tipo !== 'descriptiva' && o.tipo !== 'frecuencias').map((o) => ({ descripcion: o.descripcion, resultado: o.ok ? o.resultado : o.error })),
    local: a.motor === 'local' ? a.resultado : undefined,
  };
  return { texto, respuesta: a.respuesta, resultados, datos: numeros, categorias };
}

export default function Analizador({ estadoIA, onIrConfig, onGuardado }) {
  const [texto, setTexto] = useState(() => leerPreferencia('ia.texto', ''));
  const [motor, setMotor] = useState(() => leerPreferencia('ia.motor', 'auto'));
  const [ejemplos, setEjemplos] = useState([]);
  const [analisis, setAnalisis] = useState(null);
  const [textoResuelto, setTextoResuelto] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [mensajes, setMensajes] = useState([]);
  const [pregunta, setPregunta] = useState('');
  const [enviando, setEnviando] = useState(false);
  const finChat = useRef(null);

  const iaLista = !!estadoIA?.disponible;

  useEffect(() => {
    api.ejemplosProblemas().then((r) => setEjemplos(r.datos)).catch(() => {});
  }, []);

  useEffect(() => {
    if (mensajes.length) finChat.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [mensajes]);

  const resolver = async () => {
    setError('');
    setMensajes([]);
    setCargando(true);
    try {
      const r = await api.analizar(texto, motor);
      setAnalisis(r.analisis);
      setTextoResuelto(texto);
      if (r.analisis.falta) setError(r.analisis.falta);
      onGuardado?.();
    } catch (e) {
      setAnalisis(null);
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const enviarPregunta = async (q) => {
    const textoPregunta = (q ?? pregunta).trim();
    if (!textoPregunta || !analisis || analisis.falta) return;
    setPregunta('');
    const historial = mensajes;
    setMensajes((m) => [...m, { quien: 'tu', texto: textoPregunta }]);
    setEnviando(true);
    try {
      const r = await api.consulta(textoPregunta, contextoChat(textoResuelto, analisis), historial, motor);
      setMensajes((m) => [...m, { quien: 'ia', texto: r.respuesta, motor: r.motor }]);
    } catch (e) {
      setMensajes((m) => [...m, { quien: 'ia', texto: e.message, error: true }]);
    } finally {
      setEnviando(false);
    }
  };

  const ops = analisis
    ? analisis.operaciones || (analisis.resultado && analisis.vista === 'operaciones' ? [{ descripcion: analisis.resultado.nombre, ok: true, tipo: analisis.tipo, resultado: analisis.resultado }] : [])
    : [];
  const opsVisibles = ops.filter((o) => o.tipo !== 'descriptiva' && o.tipo !== 'frecuencias');

  const solucion = analisis && !analisis.falta && (
    <div className="solucion">
      <Pasos pasos={analisis.pasos} />
      {opsVisibles.length > 0 && (
        <>
          <h3 className="titulo-seccion">Resultados calculados</h3>
          <div className="rejilla-operaciones">
            {opsVisibles.map((op, i) => <Operacion key={i} op={op} />)}
          </div>
        </>
      )}
    </div>
  );

  return (
    <div className="panel-contenido">
      <header className="panel-cabecera">
        <h2>Resolver problema con IA</h2>
        <p className="sutil">Pega el enunciado tal como te lo dieron. La IA entiende el problema, la calculadora hace las cuentas exactas y luego se explica la solución paso a paso.</p>
      </header>


      <section className="tarjeta-entrada una-columna">
        <label htmlFor="problema" className="etiqueta-campo">Enunciado del problema</label>
        <textarea
          id="problema"
          rows={6}
          value={texto}
          onChange={(e) => { setTexto(e.target.value); guardarPreferencia('ia.texto', e.target.value); }}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && texto.trim()) resolver(); }}
          placeholder="Ej: Una urna tiene 5 bolas rojas y 3 azules. Se sacan 2 sin reemplazo. ¿Cuál es la probabilidad de que ambas sean rojas?"
        />
        <div className="fila envolver">
          <select
            value=""
            aria-label="Cargar problema de ejemplo"
            onChange={(e) => {
              const ej = ejemplos.find((x) => x.nombre === e.target.value);
              if (ej) { setTexto(ej.texto); guardarPreferencia('ia.texto', ej.texto); }
            }}
          >
            <option value="">Cargar problema de ejemplo…</option>
            {ejemplos.map((e) => <option key={e.nombre} value={e.nombre}>{e.nombre}</option>)}
          </select>
          <Segmentado
            etiqueta="Motor"
            valor={motor}
            onCambio={(m) => { setMotor(m); guardarPreferencia('ia.motor', m); }}
            opciones={[
              { id: 'auto', nombre: 'Automático', ayuda: 'Usa la IA en línea si está configurada; si falla, el analizador local' },
              { id: 'ia', nombre: 'Solo IA en línea' },
              { id: 'local', nombre: 'Solo local', ayuda: 'Sin internet: reconoce problemas típicos' },
            ]}
          />
          <button className="secundario" onClick={() => { setTexto(''); guardarPreferencia('ia.texto', ''); setAnalisis(null); setError(''); setMensajes([]); }} disabled={!texto}>Limpiar</button>
          <button className="principal grande" onClick={resolver} disabled={cargando || !texto.trim() || (motor === 'ia' && !iaLista)}>
            {cargando ? (motor !== 'local' && iaLista ? 'La IA está pensando…' : 'Analizando…') : 'Resolver'}
          </button>
        </div>
        {motor === 'ia' && !iaLista && <Aviso tipo="alerta">Para usar “Solo IA en línea” primero configúrala en Ajustes (botón ⚙ de la esquina).</Aviso>}
      </section>

      {cargando && <div className="cargando"><span className="spinner" /> {motor !== 'local' && iaLista ? 'Leyendo el problema, calculando y redactando la explicación…' : 'Analizando…'}</div>}
      {analisis?.aviso && <Aviso tipo="alerta">{analisis.aviso}</Aviso>}
      {error && (
        <div className="error">
          {error}
        </div>
      )}

      {analisis && !analisis.falta && !cargando && (
        <>
          <div className="respuesta-final">
            <div className="respuesta-cab">
              <span>Respuesta</span>
              <span className="pastilla info">{analisis.motor === 'ia' ? `IA · ${analisis.proveedor || ''}` : 'Analizador local'}</span>
            </div>
            <p className="respuesta-texto">{analisis.respuesta}</p>
            {analisis.conclusion && <p className="respuesta-conclusion">{analisis.conclusion}</p>}
          </div>

          <details className="entendido">
            <summary>Lo que se entendió del enunciado</summary>
            {analisis.pregunta && typeof analisis.pregunta === 'string' && analisis.pregunta.length > 12 && <p><strong>Se pide:</strong> {analisis.pregunta}</p>}
            {analisis.conceptos?.length > 0 && (
              <div className="chips">{analisis.conceptos.map((c) => <span className="chip activa" key={c}>{c}</span>)}</div>
            )}
            {analisis.datosDetectados?.length > 0 && (
              <p><strong>Datos ({analisis.datosDetectados.length}):</strong> {analisis.datosDetectados.map((x) => (typeof x === 'number' ? fmt(x) : x)).join(', ')}</p>
            )}
            {analisis.etiquetasDetectadas?.length > 0 && <p><strong>Cálculos:</strong> {analisis.etiquetasDetectadas.join(' · ')}</p>}
          </details>

          {analisis.vista === 'datos' && analisis.analisisDatos ? (
            <VisorResultados analisis={analisis.analisisDatos} extraPrimera={{ nombre: 'Solución', contenido: solucion }} clave="ia" />
          ) : analisis.vista === 'tablaAgrupada' && analisis.tablaAgrupada ? (
            <VisorResultados frecuenciasAgrupadas={analisis.tablaAgrupada} extraPrimera={{ nombre: 'Solución', contenido: solucion }} clave="ia-agrupada" />
          ) : (
            <section className="bloque-blanco">
              <h3 className="titulo-seccion">Desarrollo paso a paso</h3>
              {solucion}
            </section>
          )}

          <section className="bloque-blanco chat">
            <h3 className="titulo-seccion">Pregúntale sobre este problema</h3>
            <div className="chips">
              {(analisis.preguntasSugeridas || []).map((s) => (
                <button className="chip" key={s} onClick={() => enviarPregunta(s)} disabled={enviando}>{s}</button>
              ))}
            </div>
            {mensajes.length > 0 && (
              <div className="mensajes">
                {mensajes.map((m, i) => (
                  <div className={`mensaje ${m.quien}${m.error ? ' con-error' : ''}`} key={i}>
                    <strong>{m.quien === 'tu' ? 'Tú' : m.motor === 'local' ? 'Asistente local' : 'IA'}</strong>
                    <span>{m.texto}</span>
                  </div>
                ))}
                {enviando && <div className="mensaje ia"><strong>IA</strong><span className="escribiendo">Pensando…</span></div>}
                <div ref={finChat} />
              </div>
            )}
            <div className="fila">
              <input
                value={pregunta}
                onChange={(e) => setPregunta(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviarPregunta()}
                placeholder={iaLista ? 'Pregunta lo que quieras: ¿por qué se usa n − 1?, explícalo más sencillo…' : 'Ej: ¿cuál es la mediana?'}
              />
              <button className="principal" onClick={() => enviarPregunta()} disabled={enviando || !pregunta.trim()}>Preguntar</button>
            </div>
          </section>
        </>
      )}

      {!analisis && !error && !cargando && (
        <Vacio texto="Escribe o pega un problema de estadística o probabilidad y pulsa «Resolver»." icono="✦" />
      )}
    </div>
  );
}
