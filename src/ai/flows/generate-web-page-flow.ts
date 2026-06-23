'use server';

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const GenerateWebPageInputSchema = z.object({
  prompt: z.string().describe('La descripción de la página web a generar.'),
  improvement: z.string().optional().describe('Una descripción de cómo mejorar la página web actual.'),
  currentPage: z.object({
      html: z.string(),
      css: z.string(),
      javascript: z.string(),
  }).optional().describe('El código actual de la página a mejorar.'),
});
export type GenerateWebPageInput = z.infer<typeof GenerateWebPageInputSchema>;

const GenerateWebPageOutputSchema = z.object({
  html: z.string().describe('El código HTML completo de la página generada.'),
  css: z.string().describe('El código CSS para estilizar la página. Debe ser moderno y estético.'),
  javascript: z.string().describe('El código JavaScript para la interactividad de la página.'),
});
export type GenerateWebPageOutput = z.infer<typeof GenerateWebPageOutputSchema>;

export async function generateWebPage(input: GenerateWebPageInput): Promise<GenerateWebPageOutput> {
  return generateWebPageFlow(input);
}

const generateWebPagePrompt = ai.definePrompt({
  name: 'generateWebPagePrompt',
  input: {schema: GenerateWebPageInputSchema},
  output: {schema: GenerateWebPageOutputSchema},
  prompt: `Eres un desarrollador web experto que se especializa en crear y mejorar páginas web completas a partir de una descripción de texto.
Tu tarea es interpretar la descripción del usuario y generar o modificar una aplicación web completa con HTML, CSS y JavaScript.

**Reglas y Directrices:**

1.  **HTML Semántico:** Genera un HTML bien estructurado y semántico.
2.  **CSS Moderno:** Crea un archivo CSS que sea estético, moderno y responsive. Utiliza Flexbox o Grid para el layout. No uses librerías de CSS como Tailwind o Bootstrap; escribe CSS puro.
3.  **JavaScript Funcional:** El JavaScript debe ser autocontenido y manejar cualquier interactividad descrita en el prompt (ej. clics de botón, validación de formularios, etc.).
4.  **Sin Contenido de Relleno:** A menos que se solicite, no incluyas texto o imágenes de relleno genéricos. El contenido debe basarse en el prompt. Si necesitas imágenes, usa \`https://placehold.co/WIDTHxHEIGHT\`.
5.  **Código Limpio:** El código debe estar bien formateado y ser fácil de leer.

{{#if currentPage}}
**Mejora Iterativa:**
Estás modificando una página existente. Analiza el código actual y la solicitud de mejora para generar una nueva versión.

**Solicitud de Mejora:**
{{{improvement}}}

**Código Actual:**
HTML:
\`\`\`html
{{{currentPage.html}}}
\`\`\`
CSS:
\`\`\`css
{{{currentPage.css}}}
\`\`\`
JavaScript:
\`\`\`javascript
{{{currentPage.javascript}}}
\`\`\`

Genera la nueva versión completa de HTML, CSS y JavaScript basándote en la mejora solicitada.
{{else}}
**Tarea de Generación Inicial:**
Analiza la siguiente descripción y produce el código HTML, CSS y JavaScript correspondiente para crear la aplicación web desde cero.

**Descripción de la Página Web:**
{{{prompt}}}
{{/if}}
`,
});

const generateWebPageFlow = ai.defineFlow(
  {
    name: 'generateWebPageFlow',
    inputSchema: GenerateWebPageInputSchema,
    outputSchema: GenerateWebPageOutputSchema,
  },
  async input => {
    const {output} = await generateWebPagePrompt(input);
    return output!;
  }
);
