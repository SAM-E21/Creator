
// Un Flujo de Genkit que actúa como un asistente de IA consciente del proyecto llamado AlterMIA.
'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getProjectById, getTasksByProjectId, getProjectNotes, getLogEntry, getWebGeniusPagesByProjectId, saveAlterMIAChatHistory } from '@/lib/data';
import { format, subDays } from 'date-fns';

const AlterMIAInputSchema = z.object({
  projectId: z.string().describe('El ID del proyecto para el cual obtener el contexto.'),
  query: z.string().describe('La pregunta del usuario para AlterMIA.'),
  history: z.array(z.object({
    role: z.enum(['user', 'model']),
    content: z.string(),
  })).optional().describe('El historial de la conversación.'),
});
export type AlterMIAInput = z.infer<typeof AlterMIAInputSchema>;

const AlterMIAOutputSchema = z.object({
  response: z.string().describe('La respuesta de AlterMIA al usuario.'),
});
export type AlterMIAOutput = z.infer<typeof AlterMIAOutputSchema>;

export async function askAlterMIA(input: AlterMIAInput): Promise<AlterMIAOutput> {
  return altermiaFlow(input);
}

// Función para obtener las tareas y convertirlas en una cadena de texto simple.
async function getTasksContext(projectId: string): Promise<string> {
    try {
        const tasks = await getTasksByProjectId(projectId);
        if (tasks.length === 0) {
            return "No hay tareas.";
        }
        const taskList = tasks.map(t => `- ${t.content} (${t.completed ? 'Completada' : 'Pendiente'})`).join('\n');
        return taskList;
    } catch (error) {
        console.error("Error fetching tasks for AI context:", error);
        return "Error al obtener las tareas.";
    }
}

// Función para obtener las páginas de Web Genius y convertirlas en una cadena de texto.
async function getWebGeniusContext(projectId: string): Promise<string> {
   try {
        const pages = await getWebGeniusPagesByProjectId(projectId);
        if (pages.length === 0) {
            return "No hay páginas de Web Genius.";
        }
        const pageList = pages.map(p => `- ${p.name}: ${p.prompt}`).join('\n');
        return pageList;
    } catch (error) {
        console.error("Error fetching Web Genius pages for AI context:", error);
        return "Error al obtener las páginas de Web Genius.";
    }
}

// Función para obtener las entradas de la bitácora de los últimos 7 días.
async function getLogbookContext(projectId: string): Promise<string> {
    try {
        const promises = [];
        for (let i = 0; i < 7; i++) {
            const date = subDays(new Date(), i);
            const dateString = format(date, 'yyyy-MM-dd');
            promises.push(getLogEntry(projectId, dateString));
        }
        const entries = await Promise.all(promises);
        const validEntries = entries.filter(e => e && e.content);
        if (validEntries.length === 0) {
            return "No hay entradas recientes en la bitácora.";
        }
        return validEntries.map(e => `Fecha: ${e!.date}\nContenido: ${e!.content}`).join('\n\n');
    } catch (error) {
        console.error("Error fetching logbook for AI context:", error);
        return "Error al obtener la bitácora.";
    }
}


const altermiaFlow = ai.defineFlow(
  {
    name: 'altermiaFlow',
    inputSchema: AlterMIAInputSchema,
    outputSchema: AlterMIAOutputSchema,
  },
  async (input) => {
    // 1. Recopilar todo el contexto del proyecto.
    const [project, tasks, notes, webGeniusPages, logbook] = await Promise.all([
      getProjectById(input.projectId),
      getTasksContext(input.projectId),
      getProjectNotes(input.projectId).catch(err => {
        console.error("Error getting project notes for AI:", err);
        return "Error al obtener las notas.";
      }),
      getWebGeniusContext(input.projectId),
      getLogbookContext(input.projectId),
    ]);

    if (!project) {
      throw new Error('Proyecto no encontrado');
    }

    const context = `
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

    // 2. Construir el historial para el prompt.
    const history = input.history || [];
    const userMessage = { role: 'user' as const, content: input.query };
    const conversationHistory = [...history, userMessage];

    // 3. Generar la respuesta usando una llamada directa al modelo.
    const { text } = await ai.generate({
      prompt: input.query,
      history,
      system: `Eres AlterMIA, un asistente de IA experto integrado en la aplicación Creactor. Tu propósito es ayudar a los usuarios a gestionar sus proyectos respondiendo preguntas basadas en el contexto proporcionado. Eres amable, servicial y siempre respondes en español.

      A continuación se encuentra el contexto completo del proyecto actual. Utiliza esta información para responder a la consulta del usuario.
      
      CONTEXTO DEL PROYECTO:
      ${context}
      `,
    });
    
    // 4. Guardar la conversación actualizada.
    const modelMessage = { role: 'model' as const, content: text };
    const updatedHistory = [...conversationHistory, modelMessage];
    await saveAlterMIAChatHistory(input.projectId, updatedHistory);


    return {
      response: text,
    };
  }
);
