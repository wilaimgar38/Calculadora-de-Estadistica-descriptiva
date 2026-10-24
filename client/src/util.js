// Formatea numeros: hasta d decimales, sin ceros sobrantes
export const fmt = (v, d = 4) => {
  if (v === null || v === undefined || v === '') return '—';
  if (typeof v !== 'number') return String(v);
  if (!Number.isFinite(v)) return '—';
  return Number(v.toFixed(d)).toLocaleString('es-GT', { maximumFractionDigits: d });
};

export const pct = (v, d = 2) => (v === null || v === undefined ? '—' : `${fmt(v, d)}%`);

// Descarga una tabla como CSV (se abre en Excel)
export function descargarCSV(nombre, columnas, filas) {
  const esc = (v) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lineas = [columnas.map((c) => esc(c.titulo)).join(','), ...filas.map((f) => columnas.map((c) => esc(c.valor(f))).join(','))];
  const blob = new Blob(['﻿' + lineas.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${nombre}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copiarTabla(columnas, filas) {
  const texto = [columnas.map((c) => c.titulo).join('\t'), ...filas.map((f) => columnas.map((c) => c.valor(f)).join('\t'))].join('\n');
  try {
    await navigator.clipboard.writeText(texto);
    return true;
  } catch {
    return false;
  }
}

export function leerPreferencia(clave, porDefecto) {
  try {
    const v = localStorage.getItem(clave);
    return v === null ? porDefecto : JSON.parse(v);
  } catch {
    return porDefecto;
  }
}

export function guardarPreferencia(clave, valor) {
  try {
    localStorage.setItem(clave, JSON.stringify(valor));
  } catch {
    /* sin almacenamiento disponible */
  }
}

export const COLORES = ['#4f46e5', '#0d9488', '#f59e0b', '#e11d48', '#2563eb', '#16a34a', '#9333ea', '#ea580c', '#0891b2', '#65a30d', '#db2777', '#475569'];
