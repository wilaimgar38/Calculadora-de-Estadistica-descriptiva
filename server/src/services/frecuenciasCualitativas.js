const { round } = require('../util/numeros');
const { parseCategorias, clave } = require('../util/categorias');

function calcularFrecuenciasCualitativas(raw) {
  const categorias = parseCategorias(raw);
  const n = categorias.length;
  const agrupadas = new Map();

  categorias.forEach((texto) => {
    const k = clave(texto);
    const actual = agrupadas.get(k);
    if (actual) actual.fa += 1;
    else agrupadas.set(k, { categoria: texto, fa: 1, primerIndice: categorias.indexOf(texto) });
  });

  const lista = [...agrupadas.values()].sort((a, b) => b.fa - a.fa || a.categoria.localeCompare(b.categoria, 'es'));

  let faAcum = 0;
  const tabla = lista.map((c, i) => {
    faAcum += c.fa;
    return {
      posicion: i + 1,
      categoria: c.categoria,
      fa: c.fa,
      fr: round(c.fa / n),
      frPorcentaje: round((c.fa / n) * 100, 2),
      faAcum,
      frAcumPorcentaje: round((faAcum / n) * 100, 2),
    };
  });

  const maxFa = Math.max(...tabla.map((c) => c.fa));
  const modas = tabla.filter((c) => c.fa === maxFa).map((c) => c.categoria);
  const hayModa = maxFa > 1 && modas.length === 1;

  return {
    modo: 'cualitativas',
    n,
    numCategorias: tabla.length,
    tabla,
    tieneModa: hayModa,
    moda: hayModa ? modas[0] : null,
    modas,
    categoriaMaxima: tabla[0].categoria,
    frecuenciaMaxima: maxFa,
    interpretacion: hayModa
      ? `La moda es "${modas[0]}": se repite ${maxFa} veces (${round((maxFa / n) * 100, 2)}% de los datos).`
      : modas.length > 1
        ? `No hay moda única: empatan ${modas.join(', ')} con ${maxFa} repeticiones.`
        : 'Ningún valor se repite (sin moda).',
    pasos: [
      { titulo: 'Contar repeticiones', formula: 'fi = veces que aparece cada categoría', detalle: tabla.map((c) => `${c.categoria}: ${c.fa}`).join(', ') },
      { titulo: 'Frecuencia relativa', formula: 'hi = fi / n', detalle: tabla.map((c) => `${c.categoria}: ${c.fa}/${n} = ${round(c.fa / n, 4)}`).join(', ') },
      { titulo: 'Porcentaje', formula: '% = hi x 100', detalle: tabla.map((c) => `${c.categoria}: ${c.frPorcentaje}%`).join(', ') },
      { titulo: 'Moda', formula: 'Mo = categoría con mayor fi', detalle: hayModa ? `${modas[0]} (${maxFa} veces)` : modas.length > 1 ? `Empate: ${modas.join(', ')}` : 'Sin moda' },
    ],
    resumen: {
      n,
      numCategorias: tabla.length,
      moda: hayModa ? modas[0] : modas.length > 1 ? modas.join(', ') : 'Sin moda',
      frecuenciaMaxima: maxFa,
      porcentajeMaximo: round((maxFa / n) * 100, 2),
    },
  };
}

module.exports = { calcularFrecuenciasCualitativas };
