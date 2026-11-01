# Mario's English Maps — formato de contenido (concept JSON)

Un fichero JSON por concepto en `content/<NIVEL>/<ID>-<slug>.json` (ej. `content/A1/A1-03-have-got.json`).
El motor (`tools/engine.js`) lo convierte en un PDF A4 apaisado con este orden:

1. **Mapa mental** (1 página, como las capturas): título, óvalo central, 6 cajas + "Error común", y "Mini ejercicio" de 5 huecos.
2. **Explicación** (varias páginas): bloques bilingües 🇪🇸/🇬🇧 que el paginador reparte en 2 columnas.
3. **Ejercicios** (varias páginas): numerados automáticamente, con nombre/fecha.
4. **Repaso**: checklist "Lo sé hacer" + estrellas de progreso.
5. **Solucionario**: se genera solo a partir de las respuestas (`a`).

**El ejemplo de referencia es `content/A1/A1-03-have-got.json`.** Léelo entero antes de escribir.

## Comandos

```bash
node tools/validate.mjs content/A1/A1-05-....json         # errores = obligatorio arreglar; warn = muy recomendable
node tools/build.mjs content/A1/A1-05-....json --png      # PDF en pdf/<NIVEL>/, PNG por página en output/png/<ID>-NN.png
```
`build` imprime avisos como `MAP TOO FULL`, `MINI EXERCISE TOO LONG`, `MAP TITLE TOO LONG`, `SQUEEZED block`, `MISSING EMOJI`. Todos deben quedar a cero.

## Marcado dentro de los textos (HTML mínimo)

| Marca | Uso | Aspecto |
|---|---|---|
| `<b>…</b>` | palabra clave / estructura | azul, negrita |
| `<em>…</em>` | énfasis fuerte, terminación (-s, -ed) | rojo |
| `<mark>…</mark>` | idea principal | subrayador amarillo |
| `<s>…</s>` | forma incorrecta | rojo tachado |
| `<i>…</i>` | traducción / aclaración secundaria | gris |
| `<u>…</u>` | subrayado | |
| `<small>…</small>` | nota pequeña | |
| `<br>` | salto de línea | |

Solo se permiten esas etiquetas (el validador lo comprueba). Los emojis se convierten automáticamente en ilustraciones SVG (Twemoji): úsalos con generosidad en `icon`, ejemplos y vocabulario. Evita emojis de banderas de países salvo 🇪🇸 🇬🇧 🇺🇸.

En preguntas de ejercicios:
- `___` (3 guiones bajos) = hueco normal · `____` (4) = hueco medio · `_____` (5+) = hueco largo.
- `[a|b|c]` = opciones para rodear (ejercicio `choose`).

## Raíz

```json
{
  "id": "A1-05",                 // NIVEL-NN (2 dígitos)
  "level": "A1",
  "title": "DO <em>y</em> DOES",  // título GRANDE del mapa, en MAYÚSCULAS, estilo capturas (≤ 22-24 caracteres visibles)
  "file_title": "Do y does",      // nombre de fichero legible (sin HTML)
  "subtitle": "Do and does · negativas y preguntas", // en inglés (+ · aclaración corta en español)
  "icon": "❓",                    // emoji del concepto
  "map": { … },
  "explain": [ … ],               // ≥ 10 bloques (ideal 12-16)
  "exercises": [ … ],             // ≥ 12 ejercicios, ≥ 8 tipos distintos, ≥ 100 ítems en total
  "checklist": [ { "es": "…", "en": "…" } ]   // 5-7 frases "Sé…"
}
```

Títulos estilo capturas: "ALREADY <em>y</em> YET", "PREPOSICIONES DE LUGAR", "REPASO DEL SIMPLE PRESENT", "INVERSIÓN AVANZADA", "WAS <em>y</em> WERE".

## `map` (la página estrella — debe caber holgada, letra ≥ 13 px)

```json
"map": {
  "center": "Usamos <b>HAVE GOT</b> para decir lo que <b>tenemos</b>…",   // ≤ 120 caracteres
  "nodes": [ 6 nodos en orden de lectura: 1 arriba-izq, 2 arriba-der, 3 medio-izq, 4 medio-der, 5 abajo-izq, 6 abajo-der ],
  "error": { "title": "Error común", "bad": ["He have got a dog."], "good": ["He has got a dog."], "note": "he / she / it → <b>has</b> got" },
  "mini": { "es": "Completa con …", "en": "Complete with …", "items": [ exactamente 5 × { "q": "I ____ a bike.", "a": "have got", "hint": "(opcional)" } ] }
}
```
Nodo: `{ "title": "Afirmativa", "icon": "✅", "color": "green", "items": ["…", "…"], "rows": [["have got", "= tener"]], "chips": ["he","she","it"], "html": "texto", "after": "texto final", "art": "🐶" }`
- Usa `items` (2-4 viñetas cortas) y/o `rows` (pares clave → explicación) y/o `chips`. Máx. ~170 caracteres por nodo.
- `art` = emoji grande decorativo en la esquina (opcional, 2-3 nodos como mucho).
- Colores por defecto (ya bonitos): green, blue, purple, orange, pink, yellow. El error siempre es rojo.
- Nodos típicos: ¿Qué es? / Cuándo se usa / Afirmativa / Negativa / Preguntas / Palabras clave (marcadores de tiempo) / Consejo rápido / Ejemplos.
- Mini ejercicio: frases ≤ 45 caracteres.

## `explain` — bloques

Todos aceptan `"wide": true` (ocupa las 2 columnas: úsalo para tablas de ≥ 4 columnas o vocabulario de 4 columnas) y `"color"`.
Colores: green, blue, purple, orange, red, teal, pink, yellow.

| t | Campos | Para qué |
|---|---|---|
| `intro` | `es`, `en`, `formula?`, `title?`, `title_en?` | primer bloque: ¿Qué es? / What is it? |
| `rule` | `title`, `title_en`, `icon`, `es`, `en`, `formula?`, `examples?` [{en, es, icon}] | cada regla numerada ("1 · Afirmativa") |
| `table` | `title`, `title_en`, `icon`, `head` [..], `rows` [[..]], `note?`, `note_en?` | conjugaciones, listas, comparaciones |
| `examples` | `title?`, `title_en?`, `items` [{en, es, icon}] | 8-14 frases de ejemplo con traducción |
| `errors` | `monster`, `title?`, `title_en?`, `items` [{bad, good, why, why_en}] | "¡Caza al monstruo!": 5-8 errores típicos de hispanohablantes |
| `vocab` | `title`, `title_en`, `icon`, `items` [{en, es, icon}], `cols?` (2 por defecto, 4 si wide) | vocabulario con emoji |
| `dialogue` | `title`, `title_en`, `lines` [{who, en, es}] | mini diálogo realista (6-8 líneas) |
| `steps` | `title`, `title_en`, `items` [{es, en}] | "¿Cómo construyo la frase?" paso a paso |
| `compare` | `title`, `title_en`, `es?`, `en?`, `cols` [{head, color, items:[..]}] | X frente a Y (2-3 columnas) |
| `tip` | `title?`, `title_en?`, `es`, `en` | truco para recordar |

`formula`: lista de líneas; cada línea son trozos separados por ` + `; un trozo entre `*asteriscos*` sale destacado.
Ej.: `["Sujeto + *has got* + objeto", "*Has* + sujeto + *got* + …?"]`.

`monster` (los monstruos de la app de Mario): `ae` (ortografía fonética), `nono` (negar con «no»), `saltarin` (preguntas sin invertir), `serpiente` (pronombres y -s de 3ª persona), `trampas` (calcos del español), `got` (olvidar got), `error` (genérico, para niveles altos).

Orden recomendado: intro → reglas numeradas (afirmativa, negativa, pregunta…) con fórmula y 3 ejemplos cada una → tabla resumen (wide) → vocabulario/usos → compare (si hay confusión típica) → examples (10+) → errors → steps → dialogue → tip.

## `exercises` — tipos

Campos comunes: `t`, `title` (ES), `title_en`, `icon`, `es` (instrucción en español), `en` (instrucción en inglés), `bank?` (lista de palabras), `wide?`, `color?`.

| t | Ítems | Respuesta en solucionario |
|---|---|---|
| `fill` | `items` [{q con `___`, a, hint?}] | `a` |
| `choose` | `items` [{q con `[x|y]`, a}] — `a` debe ser EXACTAMENTE una opción | `a` |
| `rewrite` | `items` [{q, a}] o con 2 líneas: `labels` ["➖","❓"] y `a` ["…","…"] | `a` |
| `error` | `items` [{q (frase con 1 error), a (corregida)}] | `a` |
| `translate` | `items` [{q (español), a (inglés)}] | `a` |
| `order` | `items` [{q: "got / I / a / have / dog", a: "I have got a dog."}] — las palabras de `a` deben ser EXACTAMENTE las fichas (el validador lo comprueba; incluye "?" como ficha si es pregunta) | `a` |
| `spell` | `items` [{q: "🐶 perro", a: "dog"}] — solo letras | `a` |
| `truefalse` | `items` [{q, a: true/false, why?}] | ✓/✗ + why |
| `reading` | `text_title`, `text` ["párrafo", …], `items` [{q, a} o {q, tf: true, a: true/false, why?}] | `a` |
| `write` | `items` [{q (consigna), lines: 2, a?: "Ej.: modelo"}] | modelo o "Respuesta libre" |
| `match` | `pairs` [[izquierda, derecha], …] 4-8 pares (el motor baraja la derecha) | automático |
| `classify` | `cats` [{name, words:[…]}] 2-4 categorías | automático |
| `tablefill` | `head`, `rows` con celdas `"?respuesta"` para los huecos | tabla rellena |
| `wordsearch` | `words` (6-10, ≤ 11 letras), `clues?` ["dog · perro", …], `diag?` true para B1+ | sopa resuelta |

Recomendado por concepto: 13-16 ejercicios, 6-10 ítems cada uno, de fácil a difícil:
reconocer (choose, match, classify) → completar (fill, tablefill) → transformar (rewrite, order) → corregir (error) → producir (translate, reading, write). Para A1-A2 incluye `spell` y/o `wordsearch`.

## Estilo del contenido

- **A1-A2**: para Mario (8 años, Primaria, cole bilingüe, nivel Cambridge Movers). Frases cortas, mundo infantil: cole, familia, mascotas (Rocky el perro), su hermana Lucía, amigos (Leo, Sara, Tom, Anna), fútbol, bici, dibujos, comida. Español sencillo y cercano. Explica el porqué con trucos.
- **B1-B2**: adolescentes/adultos; situaciones reales (viajes, trabajo, series, redes). Explicación más técnica pero clara.
- **C1-C2**: adultos; registro formal/académico, matices de uso, ejemplos sofisticados.
- Siempre: explicación principal en **español** (`es`) + versión en **inglés** (`en`, más breve). Todos los ejemplos en inglés llevan traducción.
- Ataca los errores típicos de hispanohablantes (calcos, "I have 10 years", "She is no home", "You are happy?", "people is", "explain me", etc.).
- Inglés correcto, natural y británico (colour, mum, rubber), coherente con Cambridge. Comprueba cada respuesta dos veces: el solucionario debe ser impecable.
