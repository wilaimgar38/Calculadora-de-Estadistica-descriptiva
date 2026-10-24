import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { Vacio } from '../components/ui.jsx';

const ETIQUETAS = {
  analizador: 'Problema resuelto',
  descriptiva: 'Descriptiva',
  frecuencias: 'Frecuencias',
  combinatoria: 'Combinatoria',
  probabilidad: 'Probabilidad',
};

function resumen(r) {
  if (!r) return '';
  if (r.respuesta) return String(r.respuesta).slice(0, 200);
  if (r.modo === 'cualitativas') return `moda ${r.moda ?? '—'} · n ${r.n}`;
  if (r.media !== undefined) return `media ${r.media} · mediana ${r.mediana} · n ${r.n}`;
  if (r.resumen) return `media ${r.resumen.media} · ${r.numClases} clases`;
  if (r.valor !== undefined) return `= ${r.valor}`;
  if (r.posteriores) return `P(E) ${r.probabilidadTotal}`;
  if (r.formula) return `${r.formula} => ${r.resultado}`;
  if (r.resultado !== undefined) return `= ${r.resultado}`;
  return '';
}

export default function Historial({ recargar }) {
  const [datos, setDatos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [filtro, setFiltro] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = async () => {
    setCargando(true);
    setMensaje('');
    try {
      const r = await api.historial(filtro ? `?tipo=${filtro}` : '');
      setDatos(r.datos);
      setEstadisticas(r.estadisticas);
    } catch (e) {
      setMensaje(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargar();
  }, [filtro, recargar]);

  const borrar = async (id) => {
    await api.borrarCalculo(id).catch((e) => setMensaje(e.message));
    cargar();
  };

  const limpiar = async () => {
    if (!window.confirm('¿Borrar TODO el historial? Esta acción no se puede deshacer.')) return;
    await api.limpiarHistorial().catch((e) => setMensaje(e.message));
    cargar();
  };

  return (
    <div className="panel-contenido">
      <div className="cabecera-panel">
        <div>
          <h2>Historial de cálculos</h2>
          <p className="sutil">Cada cálculo queda guardado en la base de datos (tabla SQL <code>calculos</code>).</p>
        </div>
        <div className="fila">
          <select value={filtro} onChange={(e) => setFiltro(e.target.value)}>
            <option value="">Todos los tipos</option>
            {Object.entries(ETIQUETAS).map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
          <button className="secundario" onClick={cargar}>Actualizar</button>
          <button className="peligro" onClick={limpiar} disabled={!datos.length}>Vaciar</button>
        </div>
      </div>

      {estadisticas && (
        <div className="rejilla">
          <div className="tarjeta">
            <span className="tarjeta-titulo">Calculos totales</span>
            <strong className="tarjeta-valor">{estadisticas.total}</strong>
          </div>
          {estadisticas.porTipo.map((t) => (
            <div className="tarjeta" key={t.tipo}>
              <span className="tarjeta-titulo">{ETIQUETAS[t.tipo] || t.tipo}</span>
              <strong className="tarjeta-valor">{t.cantidad}</strong>
            </div>
          ))}
        </div>
      )}

      {mensaje && <div className="error">{mensaje}</div>}

      {cargando ? (
        <Vacio texto="Cargando historial..." />
      ) : datos.length === 0 ? (
        <Vacio texto="Todavía no hay cálculos guardados en la base de datos." />
      ) : (
        <ul className="historial">
          {datos.map((c) => (
            <li key={c.id}>
              <div className="historial-cab">
                <span className={`etiqueta ${c.tipo}`}>{ETIQUETAS[c.tipo] || c.tipo}</span>
                <strong>{c.titulo}</strong>
                <button className="borrar" onClick={() => borrar(c.id)} title="Eliminar del historial">×</button>
              </div>
              <div className="historial-cuerpo">
                <span>{resumen(c.resultado)}</span>
                <time>{c.creadoEn}</time>
              </div>
              <details>
                <summary>Ver datos guardados</summary>
                <pre>{JSON.stringify(c.entrada, null, 2)}</pre>
                <pre>{JSON.stringify(c.resultado, null, 2)}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
