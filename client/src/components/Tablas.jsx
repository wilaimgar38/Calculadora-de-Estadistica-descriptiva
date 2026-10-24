import { useState } from 'react';
import { fmt, pct, descargarCSV, copiarTabla } from '../util.js';

function BarraAcciones({ nombre, columnas, filas }) {
  const [copiado, setCopiado] = useState(false);
  return (
    <div className="acciones-tabla">
      <button
        className="secundario pequeno"
        onClick={async () => {
          if (await copiarTabla(columnas, filas)) {
            setCopiado(true);
            setTimeout(() => setCopiado(false), 1600);
          }
        }}
      >
        {copiado ? '✓ Copiada' : 'Copiar tabla'}
      </button>
      <button className="secundario pequeno" onClick={() => descargarCSV(nombre, columnas, filas)}>
        Descargar CSV (Excel)
      </button>
    </div>
  );
}

function Tabla({ columnas, filas, totales, clave }) {
  return (
    <div className="tabla-scroll">
      <table className="tabla">
        <thead>
          <tr>
            {columnas.map((c) => (
              <th key={c.titulo} title={c.ayuda}>{c.titulo}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {filas.map((f, i) => (
            <tr key={clave ? clave(f) : i}>
              {columnas.map((c) => (
                <td key={c.titulo}>{c.mostrar ? c.mostrar(f) : c.valor(f)}</td>
              ))}
            </tr>
          ))}
        </tbody>
        {totales && (
          <tfoot>
            <tr>
              {columnas.map((c, i) => (
                <td key={c.titulo}>{i === 0 ? 'Total' : totales[c.titulo] ?? ''}</td>
              ))}
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}

export function TablaAgrupada({ frecuencias: r }) {
  const columnas = [
    { titulo: 'Clase', valor: (c) => c.indice },
    { titulo: 'Intervalo [Li, Ls)', valor: (c) => c.intervalo },
    { titulo: 'xi (marca)', valor: (c) => c.marca, mostrar: (c) => fmt(c.marca), ayuda: 'Marca de clase: punto medio del intervalo' },
    { titulo: 'fi', valor: (c) => c.fa, ayuda: 'Frecuencia absoluta' },
    { titulo: 'Fi', valor: (c) => c.faAcum, ayuda: 'Frecuencia absoluta acumulada' },
    { titulo: 'hi', valor: (c) => c.fr, mostrar: (c) => fmt(c.fr), ayuda: 'Frecuencia relativa = fi / n' },
    { titulo: 'Hi', valor: (c) => c.frAcum, mostrar: (c) => fmt(c.frAcum), ayuda: 'Frecuencia relativa acumulada' },
    { titulo: 'hi %', valor: (c) => c.frPorcentaje, mostrar: (c) => pct(c.frPorcentaje) },
    { titulo: 'Hi %', valor: (c) => c.frAcumPorcentaje, mostrar: (c) => pct(c.frAcumPorcentaje) },
    { titulo: 'xi·fi', valor: (c) => c.xf, mostrar: (c) => fmt(c.xf) },
    { titulo: '(xi − x̄)²·fi', valor: (c) => c.desvCuadF, mostrar: (c) => fmt(c.desvCuadF) },
  ];
  const totales = {
    fi: r.n,
    hi: '1',
    'hi %': '100%',
    'xi·fi': fmt(r.totales?.xf),
    '(xi − x̄)²·fi': fmt(r.totales?.desvCuadF),
  };
  return (
    <>
      <div className="cabecera-tabla">
        <p className="sutil">
          {r.numClases} clases · amplitud {r.amplitud ?? 'variable'} · {r.metodoClases === 'Sturges' ? `regla de Sturges (k = ${r.numClasesSturges})` : r.metodoClases === 'dada' ? 'tabla dada en el problema' : 'número de clases elegido'}
        </p>
        <BarraAcciones nombre="tabla-frecuencias-agrupada" columnas={columnas} filas={r.tabla} />
      </div>
      <Tabla columnas={columnas} filas={r.tabla} totales={totales} clave={(c) => c.indice} />
    </>
  );
}

export function TablaPorValores({ tabla, n }) {
  const columnas = [
    { titulo: 'xi (valor)', valor: (c) => c.valor },
    { titulo: 'fi', valor: (c) => c.fa },
    { titulo: 'Fi', valor: (c) => c.faAcum },
    { titulo: 'hi', valor: (c) => c.fr, mostrar: (c) => fmt(c.fr) },
    { titulo: 'hi %', valor: (c) => c.frPorcentaje, mostrar: (c) => pct(c.frPorcentaje) },
    { titulo: 'Hi %', valor: (c) => c.frAcumPorcentaje, mostrar: (c) => pct(c.frAcumPorcentaje) },
    { titulo: 'xi·fi', valor: (c) => c.xf, mostrar: (c) => fmt(c.xf) },
  ];
  return (
    <>
      <div className="cabecera-tabla">
        <p className="sutil">{tabla.length} valores distintos · n = {n}</p>
        <BarraAcciones nombre="tabla-frecuencias-por-valor" columnas={columnas} filas={tabla} />
      </div>
      <Tabla columnas={columnas} filas={tabla} totales={{ fi: n, 'hi %': '100%' }} clave={(c) => c.valor} />
    </>
  );
}

export function TablaCategorias({ frecuencias: r }) {
  const columnas = [
    { titulo: '#', valor: (c) => c.posicion },
    { titulo: 'Categoría', valor: (c) => c.categoria },
    { titulo: 'fi', valor: (c) => c.fa },
    { titulo: 'Fi', valor: (c) => c.faAcum },
    { titulo: 'hi', valor: (c) => c.fr, mostrar: (c) => fmt(c.fr) },
    { titulo: 'hi %', valor: (c) => c.frPorcentaje, mostrar: (c) => pct(c.frPorcentaje) },
    { titulo: 'Hi %', valor: (c) => c.frAcumPorcentaje, mostrar: (c) => pct(c.frAcumPorcentaje) },
  ];
  return (
    <>
      <div className="cabecera-tabla">
        <p className="sutil">{r.numCategorias} categorías · n = {r.n} · ordenadas de mayor a menor frecuencia</p>
        <BarraAcciones nombre="tabla-frecuencias-categorias" columnas={columnas} filas={r.tabla} />
      </div>
      <Tabla columnas={columnas} filas={r.tabla} totales={{ fi: r.n, 'hi %': '100%' }} clave={(c) => c.categoria} />
    </>
  );
}
