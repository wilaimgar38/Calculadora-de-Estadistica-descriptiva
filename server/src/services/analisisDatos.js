// Analisis completo de una lista de datos: medidas + tabla de frecuencias + datos para graficas
const { partirTexto, esSerieNumerica } = require('../util/categorias');
const { calcularDescriptiva } = require('./descriptiva');
const { calcularFrecuencias } = require('./frecuencias');
const { calcularFrecuenciasCualitativas } = require('./frecuenciasCualitativas');

function analizarDatos(data, { tipo = 'muestra', numClases } = {}) {
  const tokens = partirTexto(data);
  if (!tokens.length) throw new Error('Debes ingresar al menos un dato.');

  if (!esSerieNumerica(tokens)) {
    const frecuencias = calcularFrecuenciasCualitativas(tokens);
    return { modo: 'cualitativas', datos: tokens, n: tokens.length, frecuencias, pasos: frecuencias.pasos };
  }

  const datos = tokens.map((t) => Number(String(t).replace(',', '.')));
  const tipoSeguro = tipo === 'poblacion' ? 'poblacion' : 'muestra';
  const descriptiva = calcularDescriptiva(datos, datos.length < 2 ? 'poblacion' : tipoSeguro);
  let frecuencias = null;
  let avisoFrecuencias = null;
  if (datos.length >= 2) {
    frecuencias = calcularFrecuencias(datos, numClases, tipoSeguro);
  } else {
    avisoFrecuencias = 'Con un solo dato no se puede construir una tabla de frecuencias agrupada.';
  }
  return {
    modo: 'cuantitativas',
    datos,
    n: datos.length,
    tipo: tipoSeguro,
    descriptiva,
    frecuencias,
    avisoFrecuencias,
    pasos: descriptiva.pasos,
  };
}

module.exports = { analizarDatos };
