import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, LineChart, Line,
  PieChart, Pie, Cell, ComposedChart, Legend, AreaChart, Area, ReferenceLine,
} from 'recharts';
import { COLORES, fmt } from '../util.js';

const ejeTick = { fontSize: 11, fill: 'var(--sutil)' };
const tooltipStyle = { contentStyle: { background: 'var(--superficie)', border: '1px solid var(--borde)', borderRadius: 10, fontSize: 13 }, labelStyle: { color: 'var(--texto)', fontWeight: 600 } };

function Marco({ titulo, descripcion, children, alto = 280 }) {
  return (
    <figure className="grafico">
      <figcaption>
        <h3>{titulo}</h3>
        {descripcion && <p className="sutil">{descripcion}</p>}
      </figcaption>
      <div style={{ width: '100%', height: alto }}>
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </figure>
  );
}

export function Histograma({ tabla }) {
  const datos = tabla.map((c) => ({ clase: c.intervalo, fi: c.fa, porcentaje: c.frPorcentaje }));
  return (
    <Marco titulo="Histograma" descripcion="Frecuencia absoluta (fi) de cada clase. Las barras se tocan porque los intervalos son continuos.">
      <BarChart data={datos} barCategoryGap={0} margin={{ top: 10, right: 12, left: -8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
        <XAxis dataKey="clase" angle={-30} textAnchor="end" tick={ejeTick} interval={0} />
        <YAxis allowDecimals={false} tick={ejeTick} />
        <Tooltip {...tooltipStyle} formatter={(v, n) => [n === 'fi' ? v : `${v}%`, n === 'fi' ? 'Frecuencia' : 'Porcentaje']} />
        <Bar dataKey="fi" fill="var(--primario)" stroke="var(--superficie)" strokeWidth={1} />
      </BarChart>
    </Marco>
  );
}

export function Poligono({ puntos }) {
  return (
    <Marco titulo="Polígono de frecuencias" descripcion="Une las marcas de clase (xi) a la altura de su frecuencia; se cierra en cero en los extremos.">
      <LineChart data={puntos} margin={{ top: 10, right: 16, left: -8, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
        <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tick={ejeTick} tickFormatter={(v) => fmt(v, 2)} />
        <YAxis allowDecimals={false} tick={ejeTick} />
        <Tooltip {...tooltipStyle} labelFormatter={(v) => `xi = ${fmt(v)}`} formatter={(v) => [v, 'Frecuencia']} />
        <Line type="linear" dataKey="fa" stroke="var(--acento)" strokeWidth={2.5} dot={{ r: 4 }} />
      </LineChart>
    </Marco>
  );
}

export function Ojiva({ puntos }) {
  return (
    <Marco titulo="Ojiva (frecuencia acumulada)" descripcion="Frecuencia acumulada (Fi) en el límite superior de cada clase. Sirve para leer la mediana y los cuartiles.">
      <LineChart data={puntos} margin={{ top: 10, right: 16, left: -8, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" />
        <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tick={ejeTick} tickFormatter={(v) => fmt(v, 2)} />
        <YAxis allowDecimals={false} tick={ejeTick} />
        <Tooltip {...tooltipStyle} labelFormatter={(v) => `Hasta ${fmt(v)}`} formatter={(v, n, p) => [`${v} (${p.payload.porcentaje}%)`, 'Acumulada']} />
        <ReferenceLine y={puntos[puntos.length - 1].Fa / 2} stroke="var(--sutil)" strokeDasharray="4 4" label={{ value: 'n/2', fill: 'var(--sutil)', fontSize: 11, position: 'insideTopLeft' }} />
        <Line type="linear" dataKey="Fa" stroke="var(--verde)" strokeWidth={2.5} dot={{ r: 4 }} />
      </LineChart>
    </Marco>
  );
}

export function BarrasValores({ tabla }) {
  const datos = tabla.map((t) => ({ valor: String(t.valor), fi: t.fa }));
  return (
    <Marco titulo="Frecuencia por valor" descripcion="Cuántas veces aparece cada valor (datos sin agrupar).">
      <BarChart data={datos} margin={{ top: 10, right: 12, left: -8, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
        <XAxis dataKey="valor" tick={ejeTick} />
        <YAxis allowDecimals={false} tick={ejeTick} />
        <Tooltip {...tooltipStyle} formatter={(v) => [v, 'Frecuencia']} />
        <Bar dataKey="fi" fill="var(--acento)" radius={[6, 6, 0, 0]} />
      </BarChart>
    </Marco>
  );
}

// Diagrama de caja y bigotes (SVG propio)
export function DiagramaCaja({ caja, media }) {
  const ancho = 640;
  const alto = 150;
  const margen = 40;
  let lo = Math.min(caja.min, caja.bigoteInferior);
  let hi = Math.max(caja.max, caja.bigoteSuperior);
  if (hi === lo) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.06;
  lo -= pad; hi += pad;
  const x = (v) => margen + ((v - lo) / (hi - lo)) * (ancho - 2 * margen);
  const yc = 62;
  const h = 44;
  const ticks = Array.from({ length: 6 }, (_, i) => lo + ((hi - lo) * i) / 5);
  return (
    <figure className="grafico">
      <figcaption>
        <h3>Diagrama de caja y bigotes</h3>
        <p className="sutil">La caja va de Q1 a Q3, la línea es la mediana, el rombo es la media y los puntos rojos son datos atípicos (fuera de Q1 − 1.5·RIC y Q3 + 1.5·RIC).</p>
      </figcaption>
      <svg viewBox={`0 0 ${ancho} ${alto}`} className="caja-svg" role="img" aria-label="Diagrama de caja">
        <line x1={x(caja.bigoteInferior)} x2={x(caja.q1)} y1={yc} y2={yc} className="bigote" />
        <line x1={x(caja.q3)} x2={x(caja.bigoteSuperior)} y1={yc} y2={yc} className="bigote" />
        <line x1={x(caja.bigoteInferior)} x2={x(caja.bigoteInferior)} y1={yc - 14} y2={yc + 14} className="bigote" />
        <line x1={x(caja.bigoteSuperior)} x2={x(caja.bigoteSuperior)} y1={yc - 14} y2={yc + 14} className="bigote" />
        <rect x={x(caja.q1)} y={yc - h / 2} width={Math.max(x(caja.q3) - x(caja.q1), 1)} height={h} rx="6" className="caja" />
        <line x1={x(caja.mediana)} x2={x(caja.mediana)} y1={yc - h / 2} y2={yc + h / 2} className="mediana" />
        {Number.isFinite(media) && (
          <path d={`M ${x(media)} ${yc - 7} L ${x(media) + 7} ${yc} L ${x(media)} ${yc + 7} L ${x(media) - 7} ${yc} Z`} className="media" />
        )}
        {caja.atipicos.map((v, i) => (
          <circle key={i} cx={x(v)} cy={yc} r="5" className="atipico" />
        ))}
        {[
          ['Q1', caja.q1],
          ['Md', caja.mediana],
          ['Q3', caja.q3],
        ].map(([t, v], i) => (
          <text key={t} x={x(v)} y={yc - h / 2 - 8 - (i === 1 ? 12 : 0)} textAnchor="middle" className="etiqueta-caja">{`${t} ${fmt(v, 2)}`}</text>
        ))}
        <line x1={margen} x2={ancho - margen} y1={alto - 30} y2={alto - 30} className="eje" />
        {ticks.map((t, i) => (
          <g key={i}>
            <line x1={x(t)} x2={x(t)} y1={alto - 30} y2={alto - 25} className="eje" />
            <text x={x(t)} y={alto - 10} textAnchor="middle" className="tick">{fmt(t, 2)}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

export function BarrasCategorias({ tabla }) {
  const datos = tabla.map((c) => ({ categoria: c.categoria, fi: c.fa, porcentaje: c.frPorcentaje }));
  return (
    <Marco titulo="Gráfico de barras" descripcion="Frecuencia absoluta de cada categoría.">
      <BarChart data={datos} margin={{ top: 10, right: 12, left: -8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
        <XAxis dataKey="categoria" angle={-30} textAnchor="end" tick={ejeTick} interval={0} />
        <YAxis allowDecimals={false} tick={ejeTick} />
        <Tooltip {...tooltipStyle} formatter={(v, n, p) => [`${v} (${p.payload.porcentaje}%)`, 'Frecuencia']} />
        <Bar dataKey="fi" radius={[6, 6, 0, 0]}>
          {datos.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} />)}
        </Bar>
      </BarChart>
    </Marco>
  );
}

export function Pastel({ tabla }) {
  const datos = tabla.map((c) => ({ categoria: c.categoria, fi: c.fa, porcentaje: c.frPorcentaje }));
  return (
    <Marco titulo="Gráfico circular (pastel)" descripcion="Porcentaje que representa cada categoría del total." alto={300}>
      <PieChart>
        <Pie data={datos} nameKey="categoria" dataKey="fi" innerRadius={50} outerRadius={100} paddingAngle={2} label={(e) => `${e.categoria} ${e.porcentaje}%`} labelLine={false}>
          {datos.map((_, i) => <Cell key={i} fill={COLORES[i % COLORES.length]} stroke="var(--superficie)" />)}
        </Pie>
        <Tooltip {...tooltipStyle} formatter={(v, n, p) => [`${v} (${p.payload.porcentaje}%)`, p.payload.categoria]} />
      </PieChart>
    </Marco>
  );
}

export function Pareto({ tabla }) {
  const datos = tabla.map((c) => ({ categoria: c.categoria, fi: c.fa, acumulado: c.frAcumPorcentaje }));
  return (
    <Marco titulo="Diagrama de Pareto" descripcion="Categorías de mayor a menor, con el porcentaje acumulado (línea).">
      <ComposedChart data={datos} margin={{ top: 10, right: 4, left: -8, bottom: 40 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
        <XAxis dataKey="categoria" angle={-30} textAnchor="end" tick={ejeTick} interval={0} />
        <YAxis yAxisId="f" allowDecimals={false} tick={ejeTick} />
        <YAxis yAxisId="p" orientation="right" domain={[0, 100]} tick={ejeTick} unit="%" />
        <Tooltip {...tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar yAxisId="f" dataKey="fi" name="Frecuencia" fill="var(--primario)" radius={[6, 6, 0, 0]} />
        <Line yAxisId="p" dataKey="acumulado" name="% acumulado" stroke="var(--naranja)" strokeWidth={2.5} dot={{ r: 3 }} />
      </ComposedChart>
    </Marco>
  );
}

export function DistribucionDiscreta({ distribucion, k, titulo }) {
  const datos = distribucion.map((d) => ({ x: d.x, p: d.p, marcado: d.x === Number(k) }));
  return (
    <Marco titulo={titulo} descripcion={`Probabilidad de cada valor de X. La barra resaltada es X = ${k}.`} alto={240}>
      <BarChart data={datos} margin={{ top: 10, right: 12, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
        <XAxis dataKey="x" tick={ejeTick} />
        <YAxis tick={ejeTick} tickFormatter={(v) => fmt(v, 3)} />
        <Tooltip {...tooltipStyle} labelFormatter={(v) => `X = ${v}`} formatter={(v) => [fmt(v, 6), 'P(X = x)']} />
        <Bar dataKey="p" radius={[4, 4, 0, 0]}>
          {datos.map((d, i) => <Cell key={i} fill={d.marcado ? 'var(--naranja)' : 'var(--primario)'} />)}
        </Bar>
      </BarChart>
    </Marco>
  );
}

export function CurvaNormal({ media, desviacion, a, b }) {
  const lo = media - 4 * desviacion;
  const hi = media + 4 * desviacion;
  const puntos = [];
  const N = 160;
  for (let i = 0; i <= N; i++) {
    const x = lo + ((hi - lo) * i) / N;
    const y = Math.exp(-0.5 * ((x - media) / desviacion) ** 2) / (desviacion * Math.sqrt(2 * Math.PI));
    const dentro = (a === null || x >= a) && (b === null || x <= b);
    puntos.push({ x: Number(x.toFixed(4)), y, area: dentro ? y : null });
  }
  return (
    <Marco titulo="Curva normal" descripcion="El área sombreada es la probabilidad calculada." alto={240}>
      <AreaChart data={puntos} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--borde)" vertical={false} />
        <XAxis dataKey="x" type="number" domain={[lo, hi]} tick={ejeTick} tickFormatter={(v) => fmt(v, 1)} />
        <YAxis hide />
        <Area type="monotone" dataKey="y" stroke="var(--primario)" fill="transparent" strokeWidth={2} isAnimationActive={false} />
        <Area type="monotone" dataKey="area" stroke="none" fill="var(--primario)" fillOpacity={0.3} isAnimationActive={false} connectNulls={false} />
        <ReferenceLine x={media} stroke="var(--sutil)" strokeDasharray="4 4" label={{ value: 'μ', fill: 'var(--sutil)', position: 'top' }} />
      </AreaChart>
    </Marco>
  );
}
