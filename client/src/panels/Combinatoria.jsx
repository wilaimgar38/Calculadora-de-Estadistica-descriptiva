import { useState } from 'react';
import { api } from '../api.js';
import Operacion from '../components/Operacion.jsx';
import { Segmentado } from '../components/ui.jsx';

const TIPOS = [
  { id: 'permutacion', nombre: 'Permutación P(n, r)', formula: 'n! / (n − r)!', usaR: true, orden: true, repite: false },
  { id: 'combinacion', nombre: 'Combinación C(n, r)', formula: 'n! / (r! (n − r)!)', usaR: true, orden: false, repite: false },
  { id: 'permutacion_repeticion', nombre: 'Permutación con repetición', formula: 'n^r', usaR: true, orden: true, repite: true },
  { id: 'combinacion_repeticion', nombre: 'Combinación con repetición', formula: 'C(n + r − 1, r)', usaR: true, orden: false, repite: true },
  { id: 'factorial', nombre: 'Factorial n!', formula: '1 × 2 × … × n', usaR: false },
];

export default function Combinatoria({ onGuardado }) {
  const [tipo, setTipo] = useState('combinacion');
  const [n, setN] = useState('10');
  const [r, setR] = useState('3');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const actual = TIPOS.find((t) => t.id === tipo);

  const calcular = async () => {
    setError('');
    setCargando(true);
    try {
      const res = await api.combinatoria({ tipo, n, r: actual.usaR ? r : undefined });
      setResultado(res.resultado);
      onGuardado?.();
    } catch (e) {
      setResultado(null);
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const elegir = (orden, repite) => {
    const t = TIPOS.find((x) => x.orden === orden && x.repite === repite);
    if (t) { setTipo(t.id); setResultado(null); }
  };

  return (
    <div className="panel-contenido">
      <header className="panel-cabecera">
        <h2>Combinatoria</h2>
        <p className="sutil">¿De cuántas formas se puede…? Responde las dos preguntas y la calculadora elige la fórmula por ti.</p>
      </header>

      <section className="tarjeta-entrada una-columna">
        {actual.usaR && (
          <div className="ayudante">
            <div className="opcion">
              <span>¿Importa el orden?</span>
              <Segmentado etiqueta="Importa el orden" valor={actual.orden ? 'si' : 'no'} onCambio={(v) => elegir(v === 'si', actual.repite)} opciones={[{ id: 'si', nombre: 'Sí (ordenar, podios, claves)' }, { id: 'no', nombre: 'No (grupos, comités)' }]} />
            </div>
            <div className="opcion">
              <span>¿Se pueden repetir elementos?</span>
              <Segmentado etiqueta="Repetición" valor={actual.repite ? 'si' : 'no'} onCambio={(v) => elegir(actual.orden, v === 'si')} opciones={[{ id: 'no', nombre: 'No' }, { id: 'si', nombre: 'Sí' }]} />
            </div>
          </div>
        )}

        <div className="formulario">
          <label>
            Tipo de cálculo
            <select value={tipo} onChange={(e) => { setTipo(e.target.value); setResultado(null); }}>
              {TIPOS.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
            </select>
          </label>
          <label>
            n (total de elementos)
            <input type="number" min="0" value={n} onChange={(e) => setN(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && calcular()} />
          </label>
          {actual.usaR && (
            <label>
              r (cuántos se eligen)
              <input type="number" min="0" value={r} onChange={(e) => setR(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && calcular()} />
            </label>
          )}
          <button className="principal grande" onClick={calcular} disabled={cargando}>{cargando ? 'Calculando…' : 'Calcular'}</button>
        </div>
        <div className="formula">Fórmula: {actual.formula}</div>
      </section>

      {error && <div className="error">{error}</div>}
      {resultado && <Operacion op={{ ok: true, tipo: 'combinatoria', descripcion: resultado.nombre, resultado }} />}
    </div>
  );
}
