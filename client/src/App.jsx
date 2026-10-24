import { useCallback, useEffect, useState } from 'react';
import { api } from './api.js';
import Analizador from './panels/Analizador.jsx';
import AnalizarDatos from './panels/AnalizarDatos.jsx';
import Combinatoria from './panels/Combinatoria.jsx';
import Probabilidad from './panels/Probabilidad.jsx';
import Historial from './panels/Historial.jsx';
import ConfigIA from './panels/ConfigIA.jsx';
import { leerPreferencia, guardarPreferencia } from './util.js';
import { Segmentado } from './components/ui.jsx';

const SECCIONES = [
  { id: 'analizador', nombre: 'Resolver con IA', icono: '✦', desc: 'Pega un enunciado' },
  { id: 'datos', nombre: 'Analizar datos', icono: 'Σ', desc: 'Medidas, tabla y gráficas' },
  { id: 'probabilidad', nombre: 'Probabilidad', icono: 'P', desc: 'Eventos, Bayes, distribuciones' },
  { id: 'combinatoria', nombre: 'Combinatoria', icono: 'nCr', desc: 'Permutaciones y combinaciones' },
  { id: 'historial', nombre: 'Historial', icono: '⛁', desc: 'Cálculos guardados' },
];

export default function App() {
  const [seccion, setSeccion] = useState(() => {
    const s = leerPreferencia('app.seccion', 'analizador');
    return SECCIONES.some((x) => x.id === s) ? s : 'analizador';
  });
  const [recargarHistorial, setRecargarHistorial] = useState(0);
  const [motorBD, setMotorBD] = useState(null);
  const [servidorCaido, setServidorCaido] = useState(false);
  const [estadoIA, setEstadoIA] = useState(null);
  const [tema, setTema] = useState(() => leerPreferencia('app.tema', 'negro'));
  const [ajustes, setAjustes] = useState(false);

  useEffect(() => {
    if (!ajustes) return undefined;
    const cerrar = (e) => e.key === 'Escape' && setAjustes(false);
    window.addEventListener('keydown', cerrar);
    return () => window.removeEventListener('keydown', cerrar);
  }, [ajustes]);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
    guardarPreferencia('app.tema', tema);
  }, [tema]);

  const refrescarIA = useCallback((nuevo) => {
    if (nuevo && nuevo.proveedores) setEstadoIA(nuevo);
    api.iaEstado().then(setEstadoIA).catch(() => {});
  }, []);

  useEffect(() => {
    api
      .salud()
      .then((s) => { setMotorBD(s.baseDatos || 'SQL'); setServidorCaido(false); })
      .catch(() => setServidorCaido(true));
    refrescarIA();
  }, [refrescarIA]);

  const ir = (id) => {
    setSeccion(id);
    guardarPreferencia('app.seccion', id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const guardado = () => setRecargarHistorial((v) => v + 1);

  return (
    <div className="app">
      <aside className="lateral">
        <div className="marca">
          <span className="logo" aria-hidden="true">Σ</span>
          <div>
            <strong>Calculadora</strong>
            <span>Estadística y Probabilidad</span>
          </div>
        </div>
        <nav className="navegacion" aria-label="Secciones">
          {SECCIONES.map((s) => (
            <button key={s.id} className={seccion === s.id ? 'activa' : ''} onClick={() => ir(s.id)} aria-current={seccion === s.id ? 'page' : undefined}>
              <span className="icono" aria-hidden="true">{s.icono}</span>
              <span className="nav-texto">
                <span>{s.nombre}</span>
                <small>{s.desc}</small>
              </span>
            </button>
          ))}
        </nav>
        <div className="estado-sistema">
          <span><span className={`indicador ${servidorCaido ? 'off' : 'on'}`} /> {servidorCaido ? 'Servidor apagado' : `BD: ${motorBD || '…'}`}</span>
        </div>
      </aside>

      <main className="principal-contenido">
        {servidorCaido && (
          <div className="error">
            No hay conexión con el servidor. Abre <code>iniciar.bat</code> o ejecuta <code>npm run dev</code> dentro de la carpeta <code>server</code>.
          </div>
        )}
        <div hidden={seccion !== 'analizador'}><Analizador estadoIA={estadoIA} onIrConfig={() => setAjustes(true)} onGuardado={guardado} /></div>
        <div hidden={seccion !== 'datos'}><AnalizarDatos onGuardado={guardado} /></div>
        <div hidden={seccion !== 'probabilidad'}><Probabilidad onGuardado={guardado} /></div>
        <div hidden={seccion !== 'combinatoria'}><Combinatoria onGuardado={guardado} /></div>
        {seccion === 'historial' && <Historial recargar={recargarHistorial} />}
      </main>

      <button className="boton-ajustes" onClick={() => setAjustes(true)} title="Ajustes" aria-label="Abrir ajustes">
        <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
          <path fill="currentColor" d="M19.14 12.94a7.07 7.07 0 0 0 .05-.94 7.07 7.07 0 0 0-.05-.94l2.03-1.58a.5.5 0 0 0 .12-.64l-1.92-3.32a.5.5 0 0 0-.61-.22l-2.39.96a7.03 7.03 0 0 0-1.62-.94l-.36-2.54A.5.5 0 0 0 13.9 2h-3.84a.5.5 0 0 0-.49.42l-.36 2.54c-.59.24-1.13.56-1.62.94l-2.39-.96a.5.5 0 0 0-.61.22L2.67 8.48a.5.5 0 0 0 .12.64l2.03 1.58a7.07 7.07 0 0 0 0 1.88l-2.03 1.58a.5.5 0 0 0-.12.64l1.92 3.32c.13.22.39.3.61.22l2.39-.96c.49.38 1.03.7 1.62.94l.36 2.54c.04.24.25.42.49.42h3.84c.24 0 .45-.18.49-.42l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.48 0 .61-.22l1.92-3.32a.5.5 0 0 0-.12-.64l-2.03-1.58ZM12 15.5A3.5 3.5 0 1 1 12 8.5a3.5 3.5 0 0 1 0 7Z" />
        </svg>
      </button>

      {ajustes && (
        <div className="fondo-modal" onMouseDown={(e) => e.target === e.currentTarget && setAjustes(false)}>
          <div className="modal" role="dialog" aria-modal="true" aria-label="Ajustes">
            <div className="modal-cab">
              <h2>Ajustes</h2>
              <button className="borrar" onClick={() => setAjustes(false)} aria-label="Cerrar ajustes">×</button>
            </div>
            <section className="modal-seccion">
              <h3>Apariencia</h3>
              <Segmentado
                etiqueta="Tema"
                valor={tema}
                onCambio={setTema}
                opciones={[
                  { id: 'negro', nombre: '☾ Negro' },
                  { id: 'claro', nombre: '☀ Claro' },
                ]}
              />
            </section>
            <section className="modal-seccion">
              <ConfigIA estadoIA={estadoIA} onActualizado={refrescarIA} />
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
