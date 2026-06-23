
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Slide, SlideElement, StyleProperties, AnimationProperties } from '@/types';
import { getProjectById, getTasksByProjectId, getProjectNotes, getLogEntry, getWebGeniusPagesByProjectId } from '@/lib/data';
import { format, subDays } from 'date-fns';


// Helper functions to get project context (similar to altermia-flow)
async function getTasksContext(projectId: string): Promise<string> {
    try {
        const tasks = await getTasksByProjectId(projectId);
        if (tasks.length === 0) return "No hay tareas.";
        return tasks.map(t => `- ${t.content} (${t.completed ? 'Completada' : 'Pendiente'})`).join('\n');
    } catch (error) {
        console.error("Error fetching tasks for presentation context:", error);
        return "Error al obtener las tareas.";
    }
}

async function getWebGeniusContext(projectId: string): Promise<string> {
   try {
        const pages = await getWebGeniusPagesByProjectId(projectId);
        if (pages.length === 0) return "No hay páginas de Web Genius.";
        return pages.map(p => `- ${p.name}: ${p.prompt}`).join('\n');
    } catch (error) {
        console.error("Error fetching Web Genius pages for presentation context:", error);
        return "Error al obtener las páginas de Web Genius.";
    }
}

async function getLogbookContext(projectId: string): Promise<string> {
    try {
        const promises = [];
        for (let i = 0; i < 7; i++) {
            promises.push(getLogEntry(projectId, format(subDays(new Date(), i), 'yyyy-MM-dd')));
        }
        const entries = await Promise.all(promises);
        const validEntries = entries.filter(e => e && e.content);
        if (validEntries.length === 0) return "No hay entradas recientes en la bitácora.";
        return validEntries.map(e => `Fecha: ${e!.date}\nContenido: ${e!.content}`).join('\n\n');
    } catch (error) {
        console.error("Error fetching logbook for presentation context:", error);
        return "Error al obtener la bitácora.";
    }
}

const StylePropertiesSchema = z.object({
  backgroundColor: z.string().optional().describe("Color de fondo del elemento (ej. '#FFFFFF', 'rgba(0,0,0,0.5)')."),
  backgroundGradient: z.string().optional().describe("Gradiente de fondo CSS (ej. 'linear-gradient(to right, #ff0000, #0000ff)')."),
  backgroundUrl: z.string().optional().describe("URL de una imagen para usar como relleno de una figura."),
  textColor: z.string().optional().describe("Color del texto (ej. '#000000')."),
  textGradient: z.string().optional().describe("Gradiente de texto CSS (ej. 'linear-gradient(to right, #ff0000, #0000ff)')."),
  opacity: z.number().min(0).max(1).optional().describe("Opacidad del elemento, de 0 (transparente) a 1 (opaco)."),
  fontSize: z.number().optional().describe("Tamaño de la fuente en píxeles (ej. 16, 24, 48)."),
  isOutline: z.boolean().optional().describe("Para figuras, si es 'true', la figura solo tendrá un contorno. Si es 'false' o no se define, tendrá relleno."),
  outlineColor: z.string().optional().describe("El color del contorno si 'isOutline' es 'true'.")
});

const AnimationPropertiesSchema = z.object({
    type: z.enum(['none', 'fadeIn', 'slideInUp', 'slideInDown', 'slideInLeft', 'slideInRight', 'zoomIn']).describe("El tipo de animación de entrada para el elemento."),
    delay: z.number().optional().describe("El retardo en milisegundos antes de que comience la animación."),
    duration: z.number().optional().describe("La duración de la animación en milisegundos."),
});

const SlideElementSchema = z.object({
  id: z.string().describe("Un ID único para el elemento."),
  type: z.enum(['text', 'image', 'shape']).describe("El tipo de elemento."),
  x: z.number().describe("Posición X en porcentaje (0-100) desde la izquierda."),
  y: z.number().describe("Posición Y en porcentaje (0-100) desde arriba."),
  width: z.number().describe("Ancho del elemento en porcentaje (0-100)."),
  height: z.union([z.number(), z.literal('auto')]).describe("Altura del elemento en porcentaje (0-100) o 'auto' para texto."),
  rotation: z.number().describe("Rotación del elemento en grados (0-360)."),
  style: StylePropertiesSchema.describe("Propiedades de estilo para el elemento."),
  animation: AnimationPropertiesSchema.optional().describe("Propiedades de animación de entrada para el elemento."),
  content: z.string().optional().describe("Contenido de texto para elementos de tipo 'text'."),
  url: z.string().optional().describe("URL para elementos de tipo 'image'."),
  shape: z.enum(['rectangle', 'circle', 'triangle']).optional().describe("Tipo de forma para elementos de tipo 'shape'."),
});

const SlideSchema = z.object({
  id: z.string().describe("Un ID único para la diapositiva."),
  elements: z.array(SlideElementSchema).describe("La lista de elementos que componen esta diapositiva."),
  background: z.object({
      color: z.string().optional().describe("Color de fondo de la diapositiva."),
      gradient: z.string().optional().describe("Gradiente de fondo de la diapositiva."),
      imageUrl: z.string().optional().describe("URL de una imagen de fondo para la diapositiva."),
  }).describe("El fondo de la diapositiva."),
  speakerNotes: z.string().describe('Las notas en español para el orador sobre qué decir durante esta diapositiva.'),
});

const GeneratePresentationInputSchema = z.object({
  prompt: z.string().optional().describe('El enfoque de la presentación. La IA usará esto para guiar la generación a partir del contexto del proyecto.'),
  projectId: z.string().optional().describe('El ID del proyecto para usar como contexto principal.'),
  improvement: z.string().optional().describe('Una descripción de cómo mejorar la presentación actual.'),
  currentSlides: z.array(SlideSchema).optional().describe('Las diapositivas actuales de la presentación a mejorar.'),
});
export type GeneratePresentationInput = z.infer<typeof GeneratePresentationInputSchema>;

const GeneratePresentationOutputSchema = z.object({
  slides: z.array(SlideSchema).describe('Un array de las diapositivas generadas para la presentación.'),
});
export type GeneratePresentationOutput = z.infer<typeof GeneratePresentationOutputSchema>;

export async function generatePresentation(input: GeneratePresentationInput): Promise<GeneratePresentationOutput> {
  return generatePresentationFlow(input);
}

const generatePresentationFlow = ai.defineFlow(
  {
    name: 'generatePresentationFlow',
    inputSchema: GeneratePresentationInputSchema,
    outputSchema: GeneratePresentationOutputSchema,
  },
  async (input) => {

    let projectContext = '';
    let userPrompt = '';

    if (input.projectId) {
       const [project, tasks, notes, webGeniusPages, logbook] = await Promise.all([
            getProjectById(input.projectId),
            getTasksContext(input.projectId),
            getProjectNotes(input.projectId),
            getWebGeniusContext(input.projectId),
            getLogbookContext(input.projectId),
        ]);

        if (project) {
            projectContext = `
Nombre del Proyecto: ${project.name}
Descripción: ${project.description}
--- TAREAS ---
${tasks}
--- NOTAS ---
${notes || 'No hay notas.'}
--- PÁGINAS WEB (WEB GENIUS) ---
${webGeniusPages}
--- BITÁCORA (ÚLTIMOS 7 DÍAS) ---
${logbook}
            `;
        }
    }


    // If improving an existing presentation
    if (input.currentSlides && input.currentSlides.length > 0) {
        const slideContext = JSON.stringify(input.currentSlides, null, 2);

        userPrompt = `
**MEJORA ITERATIVA:**
Estás modificando una presentación existente. Analiza la estructura JSON de las diapositivas actuales, la solicitud de mejora y el contexto del proyecto (si está disponible) para generar una nueva versión COMPLETA de las diapositivas. No te limites a pequeños cambios; puedes rediseñar completamente las diapositivas si la solicitud lo justifica, siguiendo los principios de diseño.

**Contexto del Proyecto (si aplica):**
${projectContext || 'No disponible.'}

**Solicitud de Mejora:**
${input.improvement}

**Diapositivas Actuales (JSON):**
${slideContext}

Genera la nueva versión completa del array de diapositivas basándote en la mejora solicitada, manteniendo el formato JSON correcto.
        `;
    // If generating a new presentation from project context
    } else if (input.projectId) {
        if (!projectContext) throw new Error('Proyecto no encontrado para la generación de la presentación.');
        
        userPrompt = `
**TAREA DE GENERACIÓN INICIAL BASADA EN PROYECTO:**
Analiza el siguiente contexto de proyecto y genera una serie de diapositivas bien estructuradas y diseñadas en el formato JSON especificado. Crea entre 5 y 10 diapositivas.

**Contexto del Proyecto:**
${projectContext}

**Enfoque de la Presentación (Opcional):**
${input.prompt || 'Genera un resumen general del estado del proyecto.'}
        `;
    // Fallback for prompt-only generation
    } else {
         userPrompt = `
**TAREA DE GENERACIÓN INICIAL:**
Analiza la siguiente descripción y produce una serie de diapositivas desde cero, siguiendo las reglas de diseño y el formato JSON especificado. Crea entre 5 y 10 diapositivas.

**Tema de la Presentación:**
${input.prompt}
        `;
    }
    
    // Instead of calling the prompt directly, use ai.generate
    const { output } = await ai.generate({
        system: `Eres un diseñador gráfico experto y un especialista en comunicación visual. Tu tarea es generar o modificar un conjunto de diapositivas para una presentación. No pienses en términos de plantillas rígidas; en su lugar, diseña cada diapositiva como un lienzo en blanco, colocando elementos de forma creativa para transmitir el mensaje de la manera más efectiva y estética posible.

**Reglas de Diseño y Filosofía:**

1.  **Composición sobre Plantilla:** No te limites a diseños de "título y contenido". Piensa en el equilibrio, el flujo visual y el espacio negativo. Coloca los elementos (texto, imágenes, formas) en cualquier lugar del lienzo (usando coordenadas x, y) para crear composiciones dinámicas e interesantes.
2.  **Jerarquía Visual:** Usa el tamaño de la fuente (\`fontSize\`), el color y la posición para establecer una jerarquía clara. El texto más importante debe ser más grande y prominente.
3.  **Estética y Color:**
    *   **Fondos de Diapositiva:** Cada diapositiva puede tener su propio fondo. Utiliza colores de fondo (\`background.color\`) sutiles, gradientes (\`background.gradient\`) o incluso imágenes de fondo (\`background.imageUrl\`) para establecer el tono.
    *   **Colores de Elementos:** Asigna colores (\`style.backgroundColor\`, \`style.textColor\`) y gradientes (\`style.backgroundGradient\`, \`style.textGradient\`) a los elementos para que contrasten bien con el fondo y entre sí. Crea paletas de colores coherentes en toda la presentación.
4.  **Uso Creativo de Elementos:**
    *   **Texto (\`type: 'text'\`):** No solo para párrafos. Úsalo para títulos, subtítulos, citas destacadas, etc. Varía el \`fontSize\`. Puedes aplicar un gradiente al texto con \`style.textGradient\`. La altura (\`height\`) debe ser \`auto\` para que el texto fluya sin cortarse.
    *   **Imágenes (\`type: 'image'\`):** Pueden ser el foco principal, un acento visual o parte de un collage. Usa placeholders de \`https://placehold.co/WIDTHxHEIGHT\`.
    *   **Formas (\`type: 'shape'\`):** Úsalas como elementos de diseño. Un rectángulo (\`shape: 'rectangle'\`) puede enmarcar texto, actuar como un panel de fondo para un grupo de elementos, o ser una simple línea decorativa (dándole una altura muy pequeña). Usa \`style.isOutline: true\` y \`style.outlineColor\` para crear figuras con solo contorno. Usa \`style.backgroundGradient\` para rellenarlas con un gradiente. ¡Incluso puedes usar \`style.backgroundUrl\` para rellenar una figura con una imagen, creando efectos de máscara!
5.  **Animaciones con Propósito:** Asigna animaciones de entrada sutiles y con propósito (\`animation\`) para guiar la atención del espectador. El título podría usar un \`fadeIn\`, mientras que los puntos de apoyo pueden usar \`slideInUp\` con un pequeño \`delay\` secuencial. No sobrecargues la diapositiva con animaciones que distraigan.
6.  **Rotación y Dinamismo:** No dudes en usar la propiedad \`rotation\` con moderación para añadir un toque dinámico a un elemento (ej. una imagen ligeramente inclinada o un post-it simulado).
7.  **IDs Únicos:** Asegúrate de que cada diapositiva y cada elemento tengan un \`id\` único y simple (ej. 'slide-1', 'element-title-1', 'element-img-2').
8.  **Notas del Orador:** Siempre proporciona notas del orador (\`speakerNotes\`) completas, detalladas y EN ESPAÑOL.
`,
        prompt: userPrompt,
        output: { schema: GeneratePresentationOutputSchema },
    });
    
    if (!output) {
      throw new Error('La IA no pudo generar la presentación.');
    }
    return output;
  }
);
