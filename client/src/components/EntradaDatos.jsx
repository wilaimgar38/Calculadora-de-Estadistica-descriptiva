import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Segmentado } from './ui.jsx';

const MARCA_LISTA = /^(?:[\s•·‣▪◦∙*+–—]|-(?![\d.]))+/;
const SERIE_CON_ESPACIOS = /^[-+]?\d+(?:[.,]\d+)?(?:\s+[-+]?\d+(?:[.,]\d+)?)+$/;

function partirTexto(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return [];
  return raw
    .split(/[\n\r\t,;|]+/)
    .map((t) => t.replace(MARCA_LISTA, '').replace(/[.;:]+$/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .flatMap((t) => (SERIE_CON_ESPACIOS.test(t) ? t.split(/\s+/) : [t]));
}

const esNumero = (t) => t !== '' && Number.isFinite(Number(String(t).replace(',', '.')));

export function infoDatos(valor) {
  const partes = partirTexto(valor);
  const numericos = partes.length > 0 && partes.every(esNumero);
  const nums = numericos ? partes.map((x) => Number(x.replace(',', '.'))) : [];
  return {
    total: partes.length,
    numericos,
    min: nums.length ? Math.min(...nums) : null,
    max: nums.length ? Math.max(...nums) : null,
    noNumericos: numericos ? [] : partes.filter((p) => !esNumero(p)).slice(0, 3),
  };
}

export default function EntradaDatos({ valor, onCambio, opciones, onOpciones, onCalcular, cargando }) {
  const [ejemplos, setEjemplos] = useState([]);
  const [conjuntos, setConjuntos] = useState([]);
  const [nombreConjunto, setNombreConjunto] = useState('');
  const [mensaje, setMensaje] = useState(null);
  const [verGuardados, setVerGuardados] = useState(false);

  const refrescarConjuntos = () => api.conjuntos().then((r) => setConjuntos(r.datos)).catch(() => {});

  useEffect(() => {
    api.ejemplos().then((r) => setEjemplos(r.datos)).catch(() => {});
    refrescarConjuntos();
  }, []);

  const info = infoDatos(valor);
  const mezcla = !info.numericos && info.total > 0 && partirTexto(valor).some(esNumero);

  const guardar = async () => {
    setMensaje(null);
    try {
      await api.guardarConjunto({ nombre: nombreConjunto, data: valor, descripcion: 'Guardado desde la calculadora' });
      setNombreConjunto('');
      setMensaje({ ok: true, texto: 'Conjunto guardado en la base de datos.' });
      refrescarConjuntos();
    } catch (e) {
      setMensaje({ ok: false, texto: e.message });
    }
  };

  return (
    <section className="tarjeta-entrada">
      <div className="entrada-principal">
        <label htmlFor="datos" className="etiqueta-campo">
          1. Escribe o pega tus datos
          <span className="sutil">Separados por comas, espacios, punto y coma o uno por línea. También acepta palabras (datos cualitativos).</span>
        </label>
        <textarea
          id="datos"
          rows={5}
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) onCalcular();
          }}
          placeholder="Ej: 72, 85, 91, 68, 78, 95, 88, 74, 69, 83   ó   Azul, Rojo, Azul, Verde"
        />
        <div className="info-datos">
          {info.total === 0 ? (
            <span>Sin datos todavía</span>
          ) : info.numericos ? (
            <>
              <span className="pastilla ok">{info.total} datos numéricos</span>
              <span>mín {info.min} · máx {info.max}</span>
            </>
          ) : (
            <span className={`pastilla ${mezcla ? 'alerta' : 'info'}`}>
              {info.total} datos de texto (cualitativos){mezcla ? ` — ojo: hay texto mezclado, p. ej. “${info.noNumericos[0]}”` : ''}
            </span>
          )}
          <span className="sutil atajo">Ctrl + Enter para calcular</span>
        </div>
      </div>

      <div className="entrada-opciones">
        <div className="etiqueta-campo">2. Opciones</div>
        <div className="opcion">
          <span>Los datos son una</span>
          <Segmentado
            etiqueta="Muestra o población"
            valor={opciones.tipo}
            onCambio={(tipo) => onOpciones({ ...opciones, tipo })}
            opciones={[
              { id: 'muestra', nombre: 'Muestra', ayuda: 'Divide entre n − 1 (s², s)' },
              { id: 'poblacion', nombre: 'Población', ayuda: 'Divide entre N (σ², σ)' },
            ]}
          />
        </div>
        <div className="opcion">
          <span>Número de clases</span>
          <div className="fila compacta">
            <Segmentado
              etiqueta="Número de clases"
              valor={opciones.numClases ? 'manual' : 'auto'}
              onCambio={(m) => onOpciones({ ...opciones, numClases: m === 'auto' ? '' : opciones.ultimoK || 5 })}
              opciones={[
                { id: 'auto', nombre: 'Automático (Sturges)' },
                { id: 'manual', nombre: 'Elegir' },
              ]}
            />
            {opciones.numClases !== '' && (
              <input
                type="number"
                min="1"
                max="50"
                className="input-corto"
                aria-label="Número de clases"
                value={opciones.numClases}
                onChange={(e) => onOpciones({ ...opciones, numClases: e.target.value, ultimoK: e.target.value })}
              />
            )}
          </div>
        </div>
        <div className="fila">
          <select
            value=""
            aria-label="Cargar ejemplo"
            onChange={(e) => {
              const ej = ejemplos.find((x) => x.nombre === e.target.value);
              if (ej) onCambio(ej.data);
            }}
          >
            <option value="">Cargar un ejemplo…</option>
            {ejemplos.map((e) => (
              <option key={e.nombre} value={e.nombre}>{e.nombre}</option>
            ))}
          </select>
          <button className="secundario" onClick={() => onCambio('')} disabled={!valor}>Limpiar</button>
        </div>
        <button className="principal grande" onClick={onCalcular} disabled={cargando || !info.total}>
          {cargando ? 'Calculando…' : 'Calcular todo'}
        </button>
      </div>

      <details className="guardados" open={verGuardados} onToggle={(e) => setVerGuardados(e.currentTarget.open)}>
        <summary>Conjuntos guardados en la base de datos ({conjuntos.length})</summary>
        <div className="fila">
          <input value={nombreConjunto} onChange={(e) => setNombreConjunto(e.target.value)} placeholder="Nombre para guardar los datos actuales" />
          <button className="secundario" onClick={guardar} disabled={!valor.trim() || !nombreConjunto.trim()}>Guardar</button>
        </div>
        {mensaje && <div className={mensaje.ok ? 'ok' : 'error'}>{mensaje.texto}</div>}
        <div className="lista-conjuntos">
          {conjuntos.map((c) => (
            <div className="conjunto" key={c.id}>
              <button className="enlace" onClick={() => onCambio(c.datos.join(', '))}>
                {c.nombre} <span className="sutil">({c.datos.length} datos)</span>
              </button>
              <button className="borrar" onClick={async () => { await api.borrarConjunto(c.id).catch(() => {}); refrescarConjuntos(); }} title="Eliminar" aria-label={`Eliminar ${c.nombre}`}>×</button>
            </div>
          ))}
        </div>
      </details>
    </section>
  );
}
