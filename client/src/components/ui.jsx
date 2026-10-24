export function Tarjeta({ titulo, valor, extra, destacada, ayuda }) {
  return (
    <div className={`tarjeta${destacada ? ' destacada' : ''}`} title={ayuda || undefined}>
      <span className="tarjeta-titulo">{titulo}</span>
      <strong className="tarjeta-valor">{valor ?? '—'}</strong>
      {extra && <span className="tarjeta-extra">{extra}</span>}
    </div>
  );
}

export function Vacio({ texto, icono = '∑', children }) {
  return (
    <div className="vacio">
      <span className="vacio-icono">{icono}</span>
      <p>{texto}</p>
      {children}
    </div>
  );
}

export function ListaResultados({ items }) {
  return (
    <div className="lista-resultados">
      {items.map((it, i) => (
        <div className="linea-resultado" key={`${it.label}-${i}`}>
          <span>{it.label}</span>
          <strong>{it.valor}</strong>
        </div>
      ))}
    </div>
  );
}

// Sub-pestanas para elegir que ver (Resumen, Tabla, Graficas...)
export function Pestanas({ opciones, activa, onCambio }) {
  return (
    <div className="subpestanas" role="tablist">
      {opciones.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={activa === o.id}
          className={activa === o.id ? 'activa' : ''}
          onClick={() => onCambio(o.id)}
        >
          {o.icono && <span aria-hidden="true">{o.icono}</span>}
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

export function Segmentado({ opciones, valor, onCambio, etiqueta }) {
  return (
    <div className="segmentado" role="radiogroup" aria-label={etiqueta}>
      {opciones.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={valor === o.id}
          className={valor === o.id ? 'activo' : ''}
          onClick={() => onCambio(o.id)}
          title={o.ayuda}
        >
          {o.nombre}
        </button>
      ))}
    </div>
  );
}

// Lista de pasos: acepta textos o { titulo, formula, detalle }
export function Pasos({ pasos }) {
  if (!pasos?.length) return <p className="sutil">No hay pasos para mostrar.</p>;
  return (
    <ol className="pasos">
      {pasos.map((p, i) => {
        const paso = typeof p === 'string' ? { detalle: p.replace(/^\d+\.\s*/, '') } : p;
        return (
          <li key={i}>
            <span className="paso-num">{i + 1}</span>
            <div>
              {paso.titulo && <strong className="paso-titulo">{paso.titulo}</strong>}
              {paso.formula && <code className="paso-formula">{paso.formula}</code>}
              {paso.detalle && <p className="paso-detalle">{paso.detalle}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function Aviso({ tipo = 'info', children }) {
  return <div className={`aviso ${tipo}`}>{children}</div>;
}
