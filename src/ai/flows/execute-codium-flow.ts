// Un Flujo de Genkit que interpreta un programa Codium y genera una aplicación web en HTML, CSS y JS.
'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExecuteCodiumInputSchema = z.object({
  program: z.string().describe('La representación JSON de los nodos y aristas del programa Codium.'),
});
export type ExecuteCodiumInput = z.infer<typeof ExecuteCodiumInputSchema>;

// Se actualiza el esquema de salida para que devuelva HTML, CSS y JS por separado.
const ExecuteCodiumOutputSchema = z.object({
  html: z.string().describe('El código HTML completo de la página generada.'),
  css: z.string().describe('El código CSS para estilizar la página.'),
  javascript: z.string().describe('El código JavaScript para la interactividad de la página.'),
});
export type ExecuteCodiumOutput = z.infer<typeof ExecuteCodiumOutputSchema>;

export async function executeCodium(input: ExecuteCodiumInput): Promise<ExecuteCodiumOutput> {
  return executeCodiumFlow(input);
}

const executeCodiumPrompt = ai.definePrompt({
  name: 'executeCodiumPrompt',
  input: {schema: ExecuteCodiumInputSchema},
  output: {schema: ExecuteCodiumOutputSchema},
  prompt: `Eres un desarrollador web experto que se especializa en crear páginas web interactivas a partir de diagramas de flujo visuales. Tu tarea es interpretar un programa visual representado en JSON y generar una aplicación web completa con HTML, CSS y JavaScript.

El JSON contiene 'nodos' y 'aristas' que definen la estructura y el flujo de la aplicación.
- Cada 'nodo' tiene un 'tipo' (ej. 'titleNode', 'containerNode', 'buttonNode', 'paragraphNode') y 'datos' que incluyen propiedades o contenido (ej. 'label: "Título"', 'code: "Hola Mundo"').
- Las 'aristas' conectan un 'source' (nodo de origen) con un 'target' (nodo de destino), definiendo la anidación y el diseño de la página.

Tu objetivo es traducir esta estructura visual en una página web funcional y estéticamente agradable.

### Documentación y Reglas de Interpretación de Codium

**1. Jerarquía HTML:**
   - Usa las aristas para determinar la anidación de elementos. Un nodo conectado desde otro debe ser un hijo de ese nodo en el DOM.
   - El nodo especial con id '1' ("Inicio") es el padre de todos los elementos de nivel superior que no están anidados en otros contenedores.

**2. Estilos CSS:**
   - Genera CSS limpio, moderno y estético. Utiliza Flexbox o Grid para el diseño de contenedores.
   - Añade estilos (márgenes, rellenos, colores, fuentes, sombras) para que la página se vea profesional por defecto.
   - El CSS generado debe ser autocontenido y devuelto en el campo 'css'.

**3. Interactividad JavaScript:**
   - El código JavaScript debe ser unificado y devuelto en el campo 'javascript'.
   - Para nodos como 'buttonNode' o 'inputNode', debes generar el JavaScript necesario para manejar los eventos (ej. clics de botón, entrada de texto).
   - Para un 'jsNode', el código que contiene debe ser incluido directamente en el script final. Este es el lugar ideal para centralizar la lógica compleja.

**4. Interpretación de Tipos de Nodos:**
   - **titleNode**: El 'code' es el texto dentro de una etiqueta \`<h1>\`.
     *Ejemplo:* \`{ "type": "titleNode", "data": { "code": "Mi Título" } }\` -> \`<h1>Mi Título</h1>\`

   - **paragraphNode**: El 'code' es el texto dentro de una etiqueta \`<p>\`.
     - Si el 'code' empieza con 'id:', úsalo como el id del elemento y no lo muestres como texto.
     *Ejemplo 1:* \`{ "code": "Hola Mundo" }\` -> \`<p>Hola Mundo</p>\`
     *Ejemplo 2:* \`{ "code": "id: 'display'" }\` -> \`<p id="display"></p>\`

   - **buttonNode**: El 'label' es el texto del botón. El 'code' es el código JS a ejecutar en el evento 'onclick'.
     *Ejemplo:* \`{ "label": "Haz Clic", "code": "alert('hola')" }\` -> Se genera un \`<button>Haz Clic</button>\` y el JS añade un event listener para que al hacer clic se ejecute \`alert('hola')\`.

   - **imageNode**: El 'code' es la URL de la imagen (\`src\`).
     *Ejemplo:* \`{ "code": "https://placehold.co/100x100" }\` -> \`<img src="https://placehold.co/100x100">\`

   - **inputNode**: Se convierte en un \`<input type="text">\`.
     - Si el 'code' empieza con 'id:', úsalo como el id del campo. El texto restante se puede usar como 'placeholder'.
     *Ejemplo:* \`{ "code": "id: 'mi-input' placeholder: 'Escribe aquí'" }\` -> \`<input type="text" id="mi-input" placeholder="Escribe aquí">\`

   - **containerNode**: Es un \`<div>\` que puede contener otros nodos. Utiliza las conexiones para determinar qué nodos van dentro. Es ideal para agrupar elementos y aplicarles estilos de layout (flex, grid).

   - **jsNode**: El código dentro de este bloque es JavaScript puro y debe ser incluido directamente en el script final de la página. Es el mejor lugar para definir funciones, variables globales y la lógica principal de la aplicación.

   - **conditionalNode / loopNode**: Actualmente, estos nodos son para planificación visual. Debes interpretar el código JS que contienen y generar el HTML que resultaría de esa lógica. (Esta es una característica avanzada, prioriza los otros nodos).

**Tarea:**
Analiza el siguiente programa JSON y produce el HTML, CSS y JavaScript correspondientes para crear la aplicación web.

Programa JSON:
{{{program}}}
`,
});

const executeCodiumFlow = ai.defineFlow(
  {
    name: 'executeCodiumFlow',
    inputSchema: ExecuteCodiumInputSchema,
    outputSchema: ExecuteCodiumOutputSchema,
  },
  async input => {
    const {output} = await executeCodiumPrompt(input);
    return output!;
  }
);
