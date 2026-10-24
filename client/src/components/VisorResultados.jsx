import { useState } from 'react';
import { Tarjeta, Pestanas, Pasos, Aviso, Segmentado } from './ui.jsx';
import { TablaAgrupada, TablaPorValores, TablaCategorias } from './Tablas.jsx';
import { Histograma, Poligono, Ojiva, BarrasValores, DiagramaCaja, BarrasCategorias, Pastel, Pareto } from './Graficas.jsx';
import { fmt, pct, leerPreferencia, guardarPreferencia } from '../util.js';

const SECCIONES = {
  resumen: { id: 'resumen', nombre: 'Resumen', icono: '◎' },
  tabla: { id: 'tabla', nombre: 'Tabla de frecuencias', icono: '▤' },
  graficas: { id: 'graficas', nombre: 'Gráficas', icono: '▥' },
  medidas: { id: 'medidas', nombre: 'Todas las medidas', icono: 'Σ' },
  pasos: { id: 'pasos', nombre: 'Paso a paso', icono: '➜' },
};

const GRAFICAS_NUM = [
  { id: 'histograma', nombre: 'Histograma' },
  { id: 'poligono', nombre: 'Polígono' },
  { id: 'ojiva', nombre: 'Ojiva' },
  { id: 'caja', nombre: 'Caja y bigotes' },
  { id: 'valores', nombre: 'Barras por valor' },
];
const GRAFICAS_CAT = [
  { id: 'barras', nombre: 'Barras' },
  { id: 'pastel', nombre: 'Pastel' },
  { id: 'pareto', nombre: 'Pareto' },
];

function useSelectorGraficas({ opciones, clave, porDefecto }) {
  const [elegidas, setElegidas] = useState(() => leerPreferencia(clave, porDefecto));
  const cambiar = (id) => {
    const nuevas = elegidas.includes(id) ? elegidas.filter((x) => x !== id) : [...elegidas, id];
    setElegidas(nuevas);
    guardarPreferencia(clave, nuevas);
  };
  const todas = () => {
    const nuevas = elegidas.length === opciones.length ? [opciones[0].id] : opciones.map((o) => o.id);
    setElegidas(nuevas);
    guardarPreferencia(clave, nuevas);
  };
  return [
    elegidas,
    <div className="selector-graficas" key="sel">
      <span className="sutil">Elige qué gráficas ver:</span>
      {opciones.map((o) => (
        <button key={o.id} className={elegidas.includes(o.id) ? 'chip activa' : 'chip'} onClick={() => cambiar(o.id)} aria-pressed={elegidas.includes(o.id)}>
          {elegidas.includes(o.id) ? '✓ ' : ''}{o.nombre}
        </button>
      ))}
      <button className="enlace" onClick={todas}>{elegidas.length === opciones.length ? 'Ver solo una' : 'Ver todas'}</button>
    </div>,
  ];
}

function GraficasNumericas({ d, f }) {
  const disponibles = GRAFICAS_NUM.filter((g) => (g.id === 'caja' || g.id === 'valores' ? !!d : !!f));
  const [elegidas, selector] = useSelectorGraficas({ opciones: disponibles, clave: 'graficas.num', porDefecto: ['histograma', 'ojiva', 'caja'] });
  const ver = (id) => elegidas.includes(id) && disponibles.some((g) => g.id === id);
  return (
    <>
      {selector}
      {elegidas.length === 0 && <p className="sutil">Selecciona al menos una gráfica.</p>}
      <div className="rejilla-graficas">
        {ver('histograma') && <Histograma tabla={f.tabla} />}
        {ver('poligono') && <Poligono puntos={f.graficas.poligono} />}
        {ver('ojiva') && <Ojiva puntos={f.graficas.ojiva} />}
        {ver('valores') && <BarrasValores tabla={d.tablaValores} />}
      </div>
      {ver('caja') && <DiagramaCaja caja={d.caja} media={d.media} />}
    </>
  );
}

function GraficasCategorias({ f }) {
  const [elegidas, selector] = useSelectorGraficas({ opciones: GRAFICAS_CAT, clave: 'graficas.cat', porDefecto: ['barras', 'pastel'] });
  return (
    <>
      {selector}
      <div className="rejilla-graficas">
        {elegidas.includes('barras') && <BarrasCategorias tabla={f.tabla} />}
        {elegidas.includes('pastel') && <Pastel tabla={f.tabla} />}
        {elegidas.includes('pareto') && <Pareto tabla={f.tabla} />}
      </div>
    </>
  );
}

function ResumenNumerico({ d, f }) {
  const etiqueta = d.tipo === 'poblacion' ? 'población' : 'muestra';
  return (
    <>
      <div className="rejilla">
        <Tarjeta titulo="Media" valor={fmt(d.media)} destacada extra={d.tipo === 'poblacion' ? 'μ' : 'x̄'} />
        <Tarjeta titulo="Mediana" valor={fmt(d.mediana)} destacada />
        <Tarjeta titulo="Moda" valor={d.modas.length ? d.modas.map((m) => fmt(m)).join(', ') : 'No hay'} destacada extra={d.tieneModa ? `${d.tipoModa} · se repite ${d.frecuenciaModa} veces` : 'Ningún valor se repite más'} />
        <Tarjeta titulo={`Desviación estándar (${etiqueta})`} valor={fmt(d.desviacionEstandar)} destacada extra={d.tipo === 'poblacion' ? 'σ' : 's'} />
        <Tarjeta titulo="Número de datos" valor={d.n} />
        <Tarjeta titulo={`Varianza (${etiqueta})`} valor={fmt(d.varianza)} />
        <Tarjeta titulo="Rango" valor={fmt(d.rango)} extra={`mín ${fmt(d.min)} · máx ${fmt(d.max)}`} />
        <Tarjeta titulo="Coef. de variación" valor={d.coefVariacion === null ? '—' : pct(d.coefVariacion)} />
      </div>
      <div className="bloque interpretacion">
        <h3>¿Qué dicen estos números?</h3>
        <ul>
          <li>El valor típico (media) es <strong>{fmt(d.media)}</strong> y la mitad de los datos está por debajo de <strong>{fmt(d.mediana)}</strong>.</li>
          <li>En promedio, los datos se alejan <strong>{fmt(d.desviacionEstandar)}</strong> de la media. {d.interpretacion.cv}</li>
          <li>{d.interpretacion.sesgo} {d.interpretacion.curtosis}</li>
          <li>{d.interpretacion.atipicos}</li>
        </ul>
      </div>
      {f && (
        <div className="rejilla-graficas">
          <Histograma tabla={f.tabla} />
          <DiagramaCaja caja={d.caja} media={d.media} />
        </div>
      )}
    </>
  );
}

function ResumenAgrupado({ f }) {
  const r = f.resumen;
  return (
    <>
      <div className="rejilla">
        <Tarjeta titulo="Media agrupada" valor={fmt(r.media)} destacada />
        <Tarjeta titulo="Mediana agrupada" valor={fmt(r.mediana)} destacada extra={`clase ${r.claseMediana}`} />
        <Tarjeta titulo="Moda agrupada" valor={fmt(r.moda)} destacada extra={`clase modal ${r.claseModal}`} />
        <Tarjeta titulo="Desviación estándar" valor={fmt(r.desviacionEstandar)} destacada extra={f.tipo === 'poblacion' ? 'población' : 'muestra'} />
        <Tarjeta titulo="n (Σfi)" valor={f.n} />
        <Tarjeta titulo="Varianza" valor={fmt(r.varianza)} />
        <Tarjeta titulo="Q1 · Q3" valor={`${fmt(r.q1)} · ${fmt(r.q3)}`} />
        <Tarjeta titulo="Clases" valor={f.numClases} extra={f.amplitud ? `amplitud ${fmt(f.amplitud)}` : 'amplitud variable'} />
      </div>
      <Histograma tabla={f.tabla} />
    </>
  );
}

function Medidas({ d, f }) {
  const grupos = [
    {
      titulo: 'Tendencia central',
      filas: [
        ['Media (x̄ o μ)', fmt(d.media)],
        ['Mediana', fmt(d.mediana)],
        ['Moda', d.modas.length ? `${d.modas.map((m) => fmt(m)).join(', ')} (${d.tipoModa})` : 'No hay moda'],
        ['Suma Σxi', fmt(d.suma)],
        ['Número de datos (n)', d.n],
      ],
    },
    {
      titulo: 'Dispersión',
      filas: [
        ['Rango', fmt(d.rango)],
        ['Varianza muestral (s²)', fmt(d.varianzaMuestral)],
        ['Desviación muestral (s)', fmt(d.desviacionMuestral)],
        ['Varianza poblacional (σ²)', fmt(d.varianzaPoblacional)],
        ['Desviación poblacional (σ)', fmt(d.desviacionPoblacional)],
        ['Coeficiente de variación', d.coefVariacion === null ? '—' : pct(d.coefVariacion)],
        ['Error estándar de la media', fmt(d.errorEstandar)],
      ],
    },
    {
      titulo: 'Posición',
      filas: [
        ['Mínimo · Máximo', `${fmt(d.min)} · ${fmt(d.max)}`],
        ['Q1 (percentil 25)', fmt(d.q1)],
        ['Q2 (mediana)', fmt(d.q2)],
        ['Q3 (percentil 75)', fmt(d.q3)],
        ['Rango intercuartílico (RIC)', fmt(d.rangoIntercuartilico)],
        ['Percentil 10 · 90', `${fmt(d.percentiles.p10)} · ${fmt(d.percentiles.p90)}`],
        ['Límites para atípicos', `${fmt(d.caja.limiteInferior)} · ${fmt(d.caja.limiteSuperior)}`],
      ],
    },
    {
      titulo: 'Forma',
      filas: [
        ['Asimetría (Fisher)', fmt(d.sesgo)],
        ['Asimetría de Pearson 3(x̄ − Md)/s', fmt(d.sesgoPearson)],
        ['Curtosis (exceso)', fmt(d.curtosis)],
        ['Lectura', `${d.interpretacion.sesgo} ${d.interpretacion.curtosis}`],
      ],
    },
  ];
  if (f) {
    grupos.push({
      titulo: 'Datos agrupados (desde la tabla)',
      filas: [
        ['Media agrupada', fmt(f.resumen.media)],
        ['Mediana agrupada', fmt(f.resumen.mediana)],
        ['Moda agrupada', fmt(f.resumen.moda)],
        ['Varianza agrupada', fmt(f.resumen.varianza)],
        ['Desviación agrupada', fmt(f.resumen.desviacionEstandar)],
      ],
    });
  }
  return (
    <>
      <div className="rejilla-medidas">
        {grupos.map((g) => (
          <div className="bloque" key={g.titulo}>
            <h3>{g.titulo}</h3>
            <div className="lista-resultados">
              {g.filas.map(([k, v]) => (
                <div className="linea-resultado" key={k}>
                  <span>{k}</span>
                  <strong>{v}</strong>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bloque">
        <h3>Datos ordenados</h3>
        <div className="datos-ordenados">{d.datosOrdenados.map((v) => fmt(v)).join('  ·  ')}</div>
      </div>
      <p className="sutil">Cuartiles y percentiles por interpolación lineal (mismo método que PERCENTIL.INC de Excel). Las medidas agrupadas usan las marcas de clase, por eso difieren un poco de las exactas.</p>
    </>
  );
}

// Visor con secciones: el usuario elige si ver resumen, tabla, graficas, medidas o pasos
export default function VisorResultados({ analisis, frecuenciasAgrupadas, extraPrimera, clave = 'visor' }) {
  const esCat = analisis?.modo === 'cualitativas';
  const soloAgrupada = !analisis && frecuenciasAgrupadas;
  const d = analisis?.descriptiva;
  const f = soloAgrupada ? frecuenciasAgrupadas : analisis?.frecuencias;

  const secciones = [
    extraPrimera && { id: 'solucion', nombre: extraPrimera.nombre, icono: '✦' },
    SECCIONES.resumen,
    SECCIONES.tabla,
    SECCIONES.graficas,
    !esCat && !soloAgrupada && SECCIONES.medidas,
    SECCIONES.pasos,
  ].filter(Boolean);

  const [activa, setActiva] = useState(() => {
    const guardada = leerPreferencia(`${clave}.seccion`, secciones[0].id);
    return secciones.some((s) => s.id === guardada) ? guardada : secciones[0].id;
  });
  const [vistaTabla, setVistaTabla] = useState(() => leerPreferencia('tabla.vista', 'agrupada'));
  const seccion = secciones.some((s) => s.id === activa) ? activa : secciones[0].id;
  const cambiar = (id) => {
    setActiva(id);
    guardarPreferencia(`${clave}.seccion`, id);
  };

  return (
    <div className="visor">
      <Pestanas opciones={secciones} activa={seccion} onCambio={cambiar} />
      <div className="visor-cuerpo">
        {seccion === 'solucion' && extraPrimera.contenido}

        {seccion === 'resumen' && (esCat ? (
          <>
            <div className="rejilla">
              <Tarjeta titulo="Total de datos (n)" valor={f.n} destacada />
              <Tarjeta titulo="Categorías distintas" valor={f.numCategorias} destacada />
              <Tarjeta titulo="Moda" valor={f.moda ?? (f.modas.length > 1 ? f.modas.join(', ') : 'No hay')} destacada extra={f.modas.length > 1 ? 'Empate' : `${f.frecuenciaMaxima} veces`} />
              <Tarjeta titulo="% de la categoría más frecuente" valor={pct(f.resumen.porcentajeMaximo)} destacada extra={f.categoriaMaxima} />
            </div>
            <Aviso>{f.interpretacion} Los datos son cualitativos (texto), así que no tienen media ni desviación: se analizan con frecuencias y porcentajes.</Aviso>
            <BarrasCategorias tabla={f.tabla} />
          </>
        ) : soloAgrupada ? (
          <ResumenAgrupado f={f} />
        ) : (
          <ResumenNumerico d={d} f={f} />
        ))}

        {seccion === 'tabla' && (esCat ? (
          <TablaCategorias frecuencias={f} />
        ) : soloAgrupada ? (
          <TablaAgrupada frecuencias={f} />
        ) : (
          <>
            <Segmentado
              etiqueta="Tipo de tabla"
              valor={f ? vistaTabla : 'valores'}
              onCambio={(v) => {
                setVistaTabla(v);
                guardarPreferencia('tabla.vista', v);
              }}
              opciones={[
                { id: 'agrupada', nombre: 'Por intervalos (agrupada)', ayuda: 'Clases de igual amplitud (Sturges)' },
                { id: 'valores', nombre: 'Por cada valor (sin agrupar)', ayuda: 'Cuenta cuántas veces aparece cada valor' },
              ]}
            />
            {f && vistaTabla === 'agrupada' ? <TablaAgrupada frecuencias={f} /> : <TablaPorValores tabla={d.tablaValores} n={d.n} />}
            {!f && analisis.avisoFrecuencias && <p className="sutil">{analisis.avisoFrecuencias}</p>}
          </>
        ))}

        {seccion === 'graficas' && (esCat ? <GraficasCategorias f={f} /> : soloAgrupada ? (
          <div className="rejilla-graficas">
            <Histograma tabla={f.tabla} />
            <Poligono puntos={f.graficas.poligono} />
            <Ojiva puntos={f.graficas.ojiva} />
          </div>
        ) : f ? <GraficasNumericas d={d} f={f} /> : <DiagramaCaja caja={d.caja} media={d.media} />)}

        {seccion === 'medidas' && <Medidas d={d} f={f} />}

        {seccion === 'pasos' && (
          <>
            {!esCat && !soloAgrupada && <h3 className="titulo-seccion">Medidas con los datos sin agrupar</h3>}
            <Pasos pasos={esCat ? f.pasos : soloAgrupada ? f.pasos : d.pasos} />
            {!esCat && !soloAgrupada && f && (
              <>
                <h3 className="titulo-seccion">Tabla de frecuencias y medidas agrupadas</h3>
                <Pasos pasos={f.pasos} />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
