import { Tarjeta, Pasos } from './ui.jsx';
import { DistribucionDiscreta, CurvaNormal } from './Graficas.jsx';
import { fmt, pct } from '../util.js';

// Muestra el resultado de una operacion de combinatoria / probabilidad / expresion
export default function Operacion({ op }) {
  if (!op.ok) {
    return (
      <div className="operacion error-op">
        <strong>{op.descripcion}</strong>
        <p>No se pudo calcular: {op.error}</p>
      </div>
    );
  }
  const r = op.resultado;
  if (op.tipo === 'descriptiva' || op.tipo === 'frecuencias') return null;

  if (op.tipo === 'expresion') {
    return (
      <div className="operacion">
        <span className="operacion-titulo">{op.descripcion}</span>
        <code className="paso-formula">{r.expresion}</code>
        <strong className="operacion-valor">{fmt(r.valor, 6)}</strong>
        {r.porcentaje !== undefined && <span className="sutil">= {pct(r.porcentaje)}</span>}
      </div>
    );
  }

  if (op.tipo === 'combinatoria') {
    return (
      <div className="operacion">
        <span className="operacion-titulo">{op.descripcion || r.nombre}</span>
        <strong className="operacion-valor">{r.valorExacto}</strong>
        <code className="paso-formula">{r.formula}</code>
        <p className="sutil">{r.sustitucion}</p>
        <p className="sutil">{r.ejemplo}</p>
      </div>
    );
  }

  // probabilidad
  return (
    <div className="operacion ancha">
      <span className="operacion-titulo">{op.descripcion || r.nombre}</span>
      <div className="fila-valores">
        <strong className="operacion-valor">{fmt(r.resultado, 6)}</strong>
        {r.resultado >= 0 && r.resultado <= 1 && <span className="pastilla info">{pct(r.resultado * 100)}</span>}
        <span className="sutil">{r.expresion || r.nombre}</span>
      </div>
      <code className="paso-formula">{r.formula}</code>
      {r.resultadoInverso !== undefined && (
        <div className="rejilla">
          <Tarjeta titulo="P(A|B)" valor={fmt(r.resultado)} />
          <Tarjeta titulo="P(B|A)" valor={fmt(r.resultadoInverso)} />
        </div>
      )}
      {r.acumuladaMenorIgual !== undefined && (
        <div className="rejilla">
          <Tarjeta titulo="P(X = k)" valor={fmt(r.resultado, 6)} />
          <Tarjeta titulo="P(X ≤ k)" valor={fmt(r.acumuladaMenorIgual, 6)} />
          <Tarjeta titulo="P(X ≥ k)" valor={fmt(r.acumuladaMayorIgual, 6)} />
          <Tarjeta titulo="Media · Varianza" valor={`${fmt(r.media)} · ${fmt(r.varianza)}`} />
        </div>
      )}
      {r.esIndependiente !== undefined && (
        <div className={r.esIndependiente ? 'ok' : 'error'}>{r.esIndependiente ? 'Los eventos son independientes.' : 'Los eventos NO son independientes.'}</div>
      )}
      {r.posteriores && (
        <div className="tabla-scroll">
          <table className="tabla">
            <thead>
              <tr><th>Hipótesis</th><th>P(Hi)</th><th>P(E|Hi)</th><th>P(Hi)·P(E|Hi)</th><th>P(Hi|E)</th><th>%</th></tr>
            </thead>
            <tbody>
              {r.posteriores.map((h) => (
                <tr key={h.nombre}>
                  <td>{h.nombre}</td><td>{h.priori}</td><td>{h.verosimilitud}</td><td>{h.verosimilitudPorPriori}</td>
                  <td><strong>{h.posterior}</strong></td><td>{h.porcentaje}%</td>
                </tr>
              ))}
            </tbody>
            <tfoot><tr><td>P(E)</td><td /><td /><td>{r.probabilidadTotal}</td><td>1</td><td>100%</td></tr></tfoot>
          </table>
        </div>
      )}
      {r.componentes && (
        <div className="rejilla">
          {r.componentes.map((c) => <Tarjeta key={c.nombre} titulo={`Aporte de ${c.nombre}`} valor={fmt(c.aporte, 6)} />)}
        </div>
      )}
      {r.conclusion && <div className="ok">{r.conclusion}</div>}
      {r.distribucion && <DistribucionDiscreta distribucion={r.distribucion} k={op.entrada?.k ?? extraerK(r)} titulo={r.nombre} />}
      {r.parametros && r.tipo === 'normal' && <CurvaNormal {...r.parametros} />}
      {r.pasos?.length > 0 && <Pasos pasos={r.pasos} />}
      {r.notas && <p className="sutil">{r.notas}</p>}
    </div>
  );
}

function extraerK(r) {
  const m = /P\(X = (\d+)\)/.exec((r.pasos || []).join(' '));
  return m ? Number(m[1]) : null;
}
