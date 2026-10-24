import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Aviso } from '../components/ui.jsx';

const DESCRIPCIONES = {
  groq: { etiqueta: 'Recomendado', texto: 'Muy rápido y gratis. Solo necesitas crear una cuenta (sin tarjeta) y copiar tu clave.', pasos: ['Entra a console.groq.com y crea una cuenta gratis.', 'Ve a “API Keys” y pulsa “Create API Key”.', 'Copia la clave (empieza con gsk_) y pégala aquí.'] },
  gemini: { etiqueta: 'Gratis con cuenta Google', texto: 'Usa los modelos Gemini de Google con su capa gratuita.', pasos: ['Entra a aistudio.google.com con tu cuenta de Google.', 'Pulsa “Get API key” → “Create API key”.', 'Copia la clave y pégala aquí.'] },
  openrouter: { etiqueta: 'Modelos :free', texto: 'Acceso a varios modelos gratuitos con un límite diario.', pasos: ['Crea una cuenta en openrouter.ai.', 'Ve a “Keys” y crea una clave.', 'Pégala aquí (se usarán modelos que terminan en :free).'] },
  ollama: { etiqueta: 'Sin internet', texto: 'La IA corre en tu computadora: sin cuenta ni clave, pero necesita una PC con buena memoria.', pasos: ['Descarga e instala Ollama desde ollama.com.', 'En una terminal ejecuta: ollama pull llama3.2', 'Deja Ollama abierto y pulsa “Guardar” aquí.'] },
};

export default function ConfigIA({ estadoIA, onActualizado }) {
  const [proveedor, setProveedor] = useState(estadoIA?.proveedor || 'groq');
  const [clave, setClave] = useState('');
  const [modelo, setModelo] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [ocupado, setOcupado] = useState('');

  useEffect(() => {
    if (estadoIA?.proveedor) setProveedor(estadoIA.proveedor);
  }, [estadoIA?.proveedor]);

  const info = estadoIA?.proveedores?.find((p) => p.id === proveedor);
  const desc = DESCRIPCIONES[proveedor];
  const mismoProveedor = estadoIA?.proveedor === proveedor;

  const guardar = async () => {
    setMensaje(null);
    setOcupado('guardar');
    try {
      const r = await api.iaConfig({ proveedor, apiKey: clave, modelo: modelo.trim() || undefined, activa: true });
      setClave('');
      onActualizado?.(r);
      setOcupado('probar');
      try {
        const p = await api.iaProbar();
        setMensaje({ ok: true, texto: `¡Listo! La IA respondió correctamente (modelo ${p.modelo}). Ya puedes resolver problemas.` });
        onActualizado?.();
      } catch (e) {
        setMensaje({ ok: false, texto: `Se guardó la configuración, pero la prueba falló: ${e.message}` });
      }
    } catch (e) {
      setMensaje({ ok: false, texto: e.message });
    } finally {
      setOcupado('');
    }
  };

  const desactivar = async () => {
    setOcupado('guardar');
    try {
      const r = await api.iaConfig({ activa: !estadoIA?.activa });
      onActualizado?.(r);
      setMensaje({ ok: true, texto: r.activa ? 'IA en línea activada.' : 'IA en línea desactivada: se usará el analizador local.' });
    } catch (e) {
      setMensaje({ ok: false, texto: e.message });
    } finally {
      setOcupado('');
    }
  };

  return (
    <div className="panel-contenido config-ia">
      <header className="panel-cabecera">
        <h3>Inteligencia artificial (gratis)</h3>
        <p className="sutil">
          Elige un servicio gratuito. La IA solo lee e interpreta el enunciado y redacta la explicación: <strong>todas las cuentas las hace la calculadora</strong>,
          por eso los resultados son exactos. Si la IA no está disponible, se usa el analizador local automáticamente.
        </p>
      </header>

      {estadoIA?.disponible && (
        <Aviso tipo="exito">
          Activa ahora: <strong>{estadoIA.nombreProveedor}</strong> · modelo {estadoIA.modelo}
          {estadoIA.claveOculta && <> · clave {estadoIA.claveOculta}</>}
        </Aviso>
      )}
      {estadoIA?.proveedor && !estadoIA?.activa && <Aviso tipo="alerta">La IA en línea está desactivada.</Aviso>}

      <div className="proveedores">
        {(estadoIA?.proveedores || []).map((p) => (
          <button key={p.id} className={`proveedor ${proveedor === p.id ? 'activo' : ''}`} onClick={() => { setProveedor(p.id); setMensaje(null); }} aria-pressed={proveedor === p.id}>
            <span className="proveedor-nombre">{p.nombre}</span>
            <span className="pastilla info">{DESCRIPCIONES[p.id]?.etiqueta}</span>
            <span className="sutil">{DESCRIPCIONES[p.id]?.texto}</span>
          </button>
        ))}
      </div>

      {info && (
        <section className="tarjeta-entrada una-columna">
          <div className="etiqueta-campo">Cómo obtenerla ({info.nombre})</div>
          <ol className="pasos-simples">
            {desc.pasos.map((p) => <li key={p}>{p}</li>)}
          </ol>
          <a className="enlace" href={info.obtenerClave} target="_blank" rel="noreferrer">Abrir {info.obtenerClave.replace('https://', '')} ↗</a>

          {info.necesitaClave && (
            <label className="campo">
              Clave de API {mismoProveedor && estadoIA?.tieneClave && <span className="sutil">(ya hay una guardada: {estadoIA.claveOculta}; déjalo vacío para conservarla)</span>}
              <input type="password" autoComplete="off" value={clave} onChange={(e) => setClave(e.target.value)} placeholder={proveedor === 'groq' ? 'gsk_…' : 'Pega tu clave aquí'} />
            </label>
          )}
          <label className="campo">
            Modelo <span className="sutil">(opcional, por defecto {info.modeloPorDefecto}; si deja de existir se elige otro automáticamente)</span>
            <input value={modelo} onChange={(e) => setModelo(e.target.value)} placeholder={info.modeloPorDefecto} />
          </label>
          <div className="fila">
            <button className="principal grande" onClick={guardar} disabled={!!ocupado || (info.necesitaClave && !clave.trim() && !(mismoProveedor && estadoIA?.tieneClave))}>
              {ocupado === 'guardar' ? 'Guardando…' : ocupado === 'probar' ? 'Probando conexión…' : 'Guardar y probar'}
            </button>
            {estadoIA?.proveedor && (
              <button className="secundario" onClick={desactivar} disabled={!!ocupado}>
                {estadoIA.activa ? 'Desactivar IA en línea' : 'Activar IA en línea'}
              </button>
            )}
          </div>
          {mensaje && <div className={mensaje.ok ? 'ok' : 'error'}>{mensaje.texto}</div>}
          <p className="sutil">La clave se guarda solo en tu computadora, en <code>server/ia.config.json</code> (no se sube a git).</p>
        </section>
      )}
    </div>
  );
}
