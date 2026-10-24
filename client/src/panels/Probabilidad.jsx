import { useState } from 'react';
import { api } from '../api.js';
import Operacion from '../components/Operacion.jsx';

const GRUPOS = [
  {
    nombre: 'Eventos',
    modos: [
      { id: 'complemento', nombre: "Complemento P(A')" },
      { id: 'union', nombre: 'Unión P(A ∪ B)' },
      { id: 'interseccion', nombre: 'Intersección P(A ∩ B)' },
      { id: 'condicional', nombre: 'Condicional P(A|B)' },
      { id: 'independencia', nombre: '¿Son independientes?' },
    ],
  },
  { nombre: 'Clásica', modos: [{ id: 'laplace', nombre: 'Casos favorables / posibles' }] },
  { nombre: 'Total y Bayes', modos: [{ id: 'probabilidad_total', nombre: 'Probabilidad total' }, { id: 'bayes', nombre: 'Teorema de Bayes' }] },
  { nombre: 'Distribuciones', modos: [{ id: 'binomial', nombre: 'Binomial' }, { id: 'poisson', nombre: 'Poisson' }, { id: 'normal', nombre: 'Normal' }] },
];

const HIP_INICIAL = [
  { nombre: 'H1', priori: '0.3', verosimilitud: '0.8' },
  { nombre: 'H2', priori: '0.7', verosimilitud: '0.4' },
];

const AYUDA = {
  complemento: 'Probabilidad de que A NO ocurra.',
  union: 'Probabilidad de que ocurra A, B o ambos. Si no conoces P(A ∩ B), déjalo vacío y se asumen independientes.',
  interseccion: 'Probabilidad de que ocurran A y B a la vez.',
  condicional: 'Probabilidad de A sabiendo que B ya ocurrió. Basta con P(A ∩ B) y P(B).',
  independencia: 'A y B son independientes si P(A ∩ B) = P(A)·P(B).',
  laplace: 'Cuando todos los resultados son igual de probables: dado, moneda, urna, baraja…',
  probabilidad_total: 'P(E) sumando sobre todas las causas Hi (deben sumar 1).',
  bayes: 'Probabilidad de cada causa Hi una vez que ocurrió E.',
  binomial: 'n intentos independientes, cada uno con probabilidad de éxito p. ¿Probabilidad de k éxitos?',
  poisson: 'Número de sucesos en un intervalo, con promedio λ. ¿Probabilidad de k sucesos?',
  normal: 'Variable continua con media μ y desviación σ. Deja vacío a o b para una sola cola.',
};

export default function Probabilidad({ onGuardado }) {
  const [modo, setModo] = useState('union');
  const [c, setC] = useState({ pa: '', pb: '', pab: '', p: '', favorables: '', posibles: '', n: '', k: '', lambda: '', media: '', desviacion: '', a: '', b: '' });
  const [independiente, setIndependiente] = useState(false);
  const [hipotesis, setHipotesis] = useState(HIP_INICIAL);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const set = (k) => (e) => setC((v) => ({ ...v, [k]: e.target.value }));
  const num = (v) => (v === '' ? undefined : Number(v));

  const cuerpo = () => {
    switch (modo) {
      case 'complemento': return { tipo: modo, p: num(c.p) };
      case 'union': return { tipo: modo, pa: num(c.pa), pb: num(c.pb), pab: num(c.pab) };
      case 'interseccion': return { tipo: modo, pa: num(c.pa), pb: num(c.pb), pab: num(c.pab), independiente };
      case 'condicional': return c.pa === '' ? { tipo: modo, pab: num(c.pab), pb: num(c.pb) } : { tipo: modo, pa: num(c.pa), pb: num(c.pb), pab: num(c.pab) };
      case 'independencia': return { tipo: modo, pa: num(c.pa), pb: num(c.pb), pab: num(c.pab) };
      case 'laplace': return { tipo: modo, favorables: num(c.favorables), posibles: num(c.posibles) };
      case 'binomial': return { tipo: modo, n: num(c.n), p: num(c.p), k: num(c.k) };
      case 'poisson': return { tipo: modo, lambda: num(c.lambda), k: num(c.k) };
      case 'normal': return { tipo: modo, media: num(c.media), desviacion: num(c.desviacion), a: c.a, b: c.b };
      default:
        return { tipo: modo, hipotesis: hipotesis.map((h) => ({ nombre: h.nombre, priori: Number(h.priori), verosimilitud: Number(h.verosimilitud) })) };
    }
  };

  const calcular = async () => {
    setError('');
    setCargando(true);
    try {
      const res = await api.probabilidad(cuerpo());
      setResultado(res.resultado);
      onGuardado?.();
    } catch (e) {
      setResultado(null);
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  const campo = (label, key, extra = {}) => (
    <label key={key}>
      {label}
      <input type="number" step="any" value={c[key]} onChange={set(key)} onKeyDown={(e) => e.key === 'Enter' && calcular()} {...extra} />
    </label>
  );
  const prob = { min: 0, max: 1, placeholder: '0 a 1' };

  const actualizarHip = (i, key, valor) => setHipotesis((hs) => hs.map((h, idx) => (idx === i ? { ...h, [key]: valor } : h)));
  const sumaPriori = hipotesis.reduce((a, h) => a + (Number(h.priori) || 0), 0);

  return (
    <div className="panel-contenido">
      <header className="panel-cabecera">
        <h2>Probabilidad</h2>
        <p className="sutil">Elige el tipo de problema, escribe los datos y obtén el resultado con su desarrollo.</p>
      </header>

      <section className="tarjeta-entrada una-columna">
        <div className="grupos-modos">
          {GRUPOS.map((g) => (
            <div className="grupo-modo" key={g.nombre}>
              <span className="grupo-nombre">{g.nombre}</span>
              <div className="chips">
                {g.modos.map((m) => (
                  <button key={m.id} className={modo === m.id ? 'chip activa' : 'chip'} onClick={() => { setModo(m.id); setResultado(null); setError(''); }}>
                    {m.nombre}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <p className="ayuda-modo">{AYUDA[modo]}</p>

        <div className="formulario">
          {modo === 'complemento' && campo('P(A)', 'p', prob)}
          {['union', 'interseccion', 'independencia'].includes(modo) && (
            <>
              {campo('P(A)', 'pa', prob)}
              {campo('P(B)', 'pb', prob)}
              {!(modo === 'interseccion' && independiente) && campo(modo === 'union' ? 'P(A ∩ B) (opcional)' : 'P(A ∩ B)', 'pab', prob)}
            </>
          )}
          {modo === 'condicional' && (
            <>
              {campo('P(A ∩ B)', 'pab', prob)}
              {campo('P(B)', 'pb', prob)}
              {campo('P(A) (opcional, para P(B|A))', 'pa', prob)}
            </>
          )}
          {modo === 'interseccion' && (
            <label className="checkbox">
              <input type="checkbox" checked={independiente} onChange={(e) => setIndependiente(e.target.checked)} />
              Son independientes: P(A)·P(B)
            </label>
          )}
          {modo === 'laplace' && (
            <>
              {campo('Casos favorables', 'favorables', { min: 0 })}
              {campo('Casos posibles', 'posibles', { min: 1 })}
            </>
          )}
          {modo === 'binomial' && (
            <>
              {campo('n (ensayos)', 'n', { min: 0, step: 1 })}
              {campo('p (prob. de éxito)', 'p', prob)}
              {campo('k (éxitos)', 'k', { min: 0, step: 1 })}
            </>
          )}
          {modo === 'poisson' && (
            <>
              {campo('λ (promedio)', 'lambda', { min: 0 })}
              {campo('k (ocurrencias)', 'k', { min: 0, step: 1 })}
            </>
          )}
          {modo === 'normal' && (
            <>
              {campo('Media μ', 'media')}
              {campo('Desviación σ', 'desviacion', { min: 0 })}
              {campo('Desde a (opcional)', 'a')}
              {campo('Hasta b (opcional)', 'b')}
            </>
          )}
        </div>

        {(modo === 'bayes' || modo === 'probabilidad_total') && (
          <div className="hipotesis">
            <div className="fila-hip cab"><span>Hipótesis</span><span>P(Hi) previa</span><span>P(E|Hi)</span><span /></div>
            {hipotesis.map((h, i) => (
              <div className="fila-hip" key={i}>
                <input value={h.nombre} onChange={(e) => actualizarHip(i, 'nombre', e.target.value)} aria-label="Nombre" />
                <input type="number" step="any" value={h.priori} onChange={(e) => actualizarHip(i, 'priori', e.target.value)} aria-label="P(Hi)" />
                <input type="number" step="any" value={h.verosimilitud} onChange={(e) => actualizarHip(i, 'verosimilitud', e.target.value)} aria-label="P(E|Hi)" />
                <button className="borrar" onClick={() => setHipotesis((hs) => hs.filter((_, idx) => idx !== i))} disabled={hipotesis.length <= 2} aria-label="Quitar">×</button>
              </div>
            ))}
            <div className="fila">
              <button className="secundario" onClick={() => setHipotesis((hs) => [...hs, { nombre: `H${hs.length + 1}`, priori: '', verosimilitud: '' }])}>+ Agregar hipótesis</button>
              <span className={`pastilla ${Math.abs(sumaPriori - 1) < 1e-9 ? 'ok' : 'alerta'}`}>Suma de previas: {Number(sumaPriori.toFixed(4))}{Math.abs(sumaPriori - 1) < 1e-9 ? ' ✓' : ' (debe ser 1)'}</span>
            </div>
          </div>
        )}

        <button className="principal grande" onClick={calcular} disabled={cargando}>{cargando ? 'Calculando…' : 'Calcular'}</button>
      </section>

      {error && <div className="error">{error}</div>}
      {resultado && <Operacion op={{ ok: true, tipo: 'probabilidad', descripcion: resultado.nombre, resultado, entrada: { k: c.k } }} />}
    </div>
  );
}
