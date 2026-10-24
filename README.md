# Calculadora de Estadística descriptiva

Proyecto para el curso de estadistica: calculos interactivos de estadistica descriptiva,
frecuencias agrupadas, combinatoria y probabilidad, con historial guardado en base de datos **SQL**.

| Capa | Tecnologia |
|------|------------|
| Frontend | React 18 + Vite, graficas con Recharts |
| Backend | Node.js + Express |
| Base de datos | SQL - **MySQL 8.0** (bd `estadistica_curso`), con respaldo automatico en SQLite |

## Configuracion de la base de datos (MySQL)

Credenciales y opciones en `server/.env` (archivo local, no se sube a git; ver `.env.example`):

```env
DB_DRIVER=mysql          # o sqlite para usar el archivo local
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=tu_clave_de_mysql
DB_NAME=estadistica_curso
```

- Las tablas (`calculos`, `conjuntos_datos`) se crean solas al arrancar.
- Si MySQL no esta disponible, el servidor avisa y sigue con SQLite sin perder funcionalidad.
- Copiar lo que habia en SQLite a MySQL: `npm run db:migrar` (evita duplicados, se puede repetir).

## Requisitos

- Node.js 22.5 o superior
- MySQL 8.0 en ejecucion (servicio `MySQL80`) para usar SQL con MySQL

## Como ejecutarlo

Abre dos terminales en la carpeta `stats-calculator`:

```bash
# Terminal 1 - backend (puerto 4000)
cd server
npm install
npm run dev

# Terminal 2 - frontend (puerto 5173)
cd client
npm install
npm run dev
```

Despues abre **http://localhost:5173**.

Tambien puedes usar el atajo `iniciar.bat` en la raiz del proyecto, que arranca ambos servidores.

La base de datos **MySQL** (`estadistica_curso`) se crea sola la primera vez que arranca el backend;
si prefieres SQLite, cambia `DB_DRIVER=sqlite` en `server/.env` y el archivo se crea en `server/db/estadistica.db`.

## Funcionalidades

1. **Resolver con IA** - pegas el enunciado completo, redactado como sea:
   - Con una **IA gratuita** (Groq, Google Gemini, OpenRouter o Ollama sin internet) que se configura
     desde la pestaña *Configurar IA*: la IA interpreta el problema, **la calculadora hace todas las
     cuentas** (resultados exactos) y la IA redacta la respuesta y el desarrollo paso a paso.
   - Sin IA configurada (o si falla) usa el **analizador local** en español, sin internet.
   - Muestra la respuesta, la solución, y si el problema trae datos: tabla de frecuencias, gráficas y medidas.
   - Chat para preguntas de seguimiento ("¿por qué se usa n − 1?", "explícalo más sencillo").
2. **Analizar datos** - pegas una lista (números o palabras) y eliges qué ver:
   *Resumen*, *Tabla de frecuencias* (agrupada por intervalos o por cada valor, con copiar y descargar CSV),
   *Gráficas* (histograma, polígono, ojiva, caja y bigotes, barras; pastel y Pareto para datos de texto),
   *Todas las medidas* (centrales, dispersión muestral y poblacional, cuartiles, percentiles, asimetría,
   curtosis, atípicos) y *Paso a paso* con fórmulas y sustitución. Opción muestra/población y número de clases.
3. **Probabilidad** - complemento, unión, intersección, condicional, independencia, regla de Laplace,
   probabilidad total, Bayes, y distribuciones **binomial**, **Poisson** y **normal** (con gráfica).
4. **Combinatoria** - permutaciones y combinaciones (con y sin repetición) y factorial con resultados
   exactos aunque sean enormes; un asistente elige la fórmula ("¿importa el orden?", "¿se repite?").
5. **Historial (SQL/MySQL)** - cada cálculo se guarda en la tabla `calculos`; conjuntos de datos en `conjuntos_datos`.

## IA gratuita (opcional)

1. Abre la pestaña **Configurar IA** y elige un servicio:
   - **Groq** (recomendado): crea una cuenta gratis en https://console.groq.com/keys y copia la clave.
   - **Google Gemini**: clave gratis en https://aistudio.google.com/app/apikey
   - **OpenRouter**: modelos `:free` en https://openrouter.ai/keys
   - **Ollama**: sin internet ni clave; instala https://ollama.com y ejecuta `ollama pull llama3.2`.
2. Pega la clave y pulsa **Guardar y probar**.

La clave se guarda solo en `server/ia.config.json` (ignorado por git). También puedes usar variables
de entorno en `server/.env`: `IA_PROVEEDOR=groq`, `IA_API_KEY=...`, `IA_MODELO=` (opcional).
Si el modelo por defecto deja de existir, el servidor elige otro disponible automáticamente.

## API (puerto 4000)

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/api/calculos/descriptiva` | `{ data, tipo: "muestra" \| "poblacion" }` |
| POST | `/api/calculos/frecuencias` | `{ data, numClases? }` |
| POST | `/api/calculos/combinatoria` | `{ tipo, n, r }` |
| POST | `/api/calculos/probabilidad` | `{ tipo, ... }` |
| POST | `/api/calculos/datos` | `{ data, tipo, numClases? }` - análisis completo (medidas + tabla + gráficas) |
| POST | `/api/analizar` | `{ texto, motor: "auto" \| "ia" \| "local" }` - resuelve un problema |
| POST | `/api/analizar/consulta` | `{ pregunta, contexto, historial }` - preguntas de seguimiento |
| GET/POST | `/api/ia/estado`, `/api/ia/config`, `/api/ia/probar` | Configuración de la IA gratuita |
| GET | `/api/ejemplos-problemas` | Enunciados de ejemplo para probar el analizador |
| GET | `/api/historial?tipo=&limite=` | Historial de calculos |
| DELETE | `/api/historial/:id` | Borra un calculo |
| DELETE | `/api/historial` | Vacia el historial |
| GET/POST | `/api/conjuntos` | Conjuntos de datos guardados |
| GET | `/api/ejemplos` | Ejemplos del curso |

## Estructura

```
stats-calculator/
├── server/
│   ├── src/index.js          # Servidor Express
│   ├── src/db.js             # Selector de motor SQL (MySQL / SQLite)
│   ├── src/database/         # Conexiones MySQL y SQLite
│   ├── src/routes/api.js     # Endpoints REST
│   ├── src/services/         # Motor de calculos, analizador local, ia.js y resolverIA.js
│   ├── src/util/             # Texto, numeros (BigInt) y evaluador seguro de expresiones
│   └── sql/                  # Esquemas SQL y script de migracion
└── client/
    ├── src/App.jsx           # Layout y pestañas
    ├── src/components/       # Visor de resultados, tablas, graficas, entrada de datos
    ├── src/panels/           # Analizador (IA), AnalizarDatos, Probabilidad, Combinatoria, Historial, ConfigIA
    └── vite.config.js        # Proxy /api -> localhost:4000
```
