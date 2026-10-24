import { useState } from 'react';
import { api } from '../api.js';
import EntradaDatos from '../components/EntradaDatos.jsx';
import VisorResultados from '../components/VisorResultados.jsx';
import { Vacio } from '../components/ui.jsx';
import { leerPreferencia, guardarPreferencia } from '../util.js';

export default function AnalizarDatos({ onGuardado }) {
  const [datos, setDatos] = useState(() => leerPreferencia('datos.texto', ''));
  const [opciones, setOpciones] = useState(() => leerPreferencia('datos.opciones', { tipo: 'muestra', numClases: '' }));
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const calcular = async (opc = opciones) => {
    if (!datos.trim()) return;
    setError('');
    setCargando(true);
    try {
      const r = await api.datos(datos, opc.tipo, opc.numClases === '' ? undefined : opc.numClases);
      setResultado(r.resultado);
      onGuardado?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const cambiarDatos = (v) => {
    setDatos(v);
    guardarPreferencia('datos.texto', v);
  };

  const cambiarOpciones = (o) => {
    setOpciones(o);
    guardarPreferencia('datos.opciones', o);
    // si ya hay resultados, se recalcula al cambiar muestra/poblacion o las clases
    if (resultado && datos.trim() && (o.numClases === '' || Number(o.numClases) >= 1)) calcular(o);
  };

  return (
    <div className="panel-contenido">
      <header className="panel-cabecera">
        <h2>Analizar datos</h2>
        <p className="sutil">Pega tus datos y obtén de una vez las medidas, la tabla de frecuencias, las gráficas y el desarrollo paso a paso.</p>
      </header>

      <EntradaDatos valor={datos} onCambio={cambiarDatos} opciones={opciones} onOpciones={cambiarOpciones} onCalcular={() => calcular()} cargando={cargando} />

      {error && <div className="error">{error}</div>}

      {resultado ? (
        <VisorResultados analisis={resultado} clave="datos" />
      ) : (
        !error && <Vacio texto="Los resultados aparecerán aquí: resumen, tabla de frecuencias, gráficas, todas las medidas y el paso a paso." />
      )}
    </div>
  );
}
