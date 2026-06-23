
'use server';

import { suggestTasks } from '@/ai/flows/suggest-tasks';
import { executeCodium } from '@/ai/flows/execute-codium-flow';
import { generateWebPage } from '@/ai/flows/generate-web-page-flow';
import { askAlterMIA } from '@/ai/flows/altermia-flow';
import { generatePresentation, GeneratePresentationInput, GeneratePresentationOutput } from '@/ai/flows/generate-presentation-flow';
import { updateUserProfile } from '@/lib/data';
import type { UserProfile } from '@/types';


export async function handleSuggestTasks(taskDescription: string, projectContext: string) {
  try {
    if (!taskDescription) {
      throw new Error('Task description cannot be empty.');
    }
    const result = await suggestTasks({ taskDescription, projectContext });
    return { success: true, subtasks: result.subtasks };
  } catch (error) {
    console.error('Error suggesting tasks:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return { success: false, error: errorMessage };
  }
}


export async function handleExecuteCodium(program: string) {
  try {
    if (!program) {
      throw new Error('El programa no puede estar vacío.');
    }
    const result = await executeCodium({ program });
    return { success: true, ...result };
  } catch (error) {
    console.error('Error ejecutando Codium:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, error: errorMessage };
  }
}

export async function handleGenerateWebPage(prompt: string, improvement?: string, currentPage?: {html: string, css: string, javascript: string}) {
  try {
    if (!prompt) {
      throw new Error('El prompt no puede estar vacío.');
    }
    const result = await generateWebPage({ prompt, improvement, currentPage });
    return { success: true, ...result };
  } catch (error) {
    console.error('Error generando la página web:', error);
    const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
    return { success: false, error: errorMessage };
  }
}

export async function handleAskAlterMIA(
  projectId: string, 
  query: string,
  history: {role: 'user' | 'model', content: string}[]
) {
    try {
        const result = await askAlterMIA({ projectId, query, history });
        return { success: true, response: result.response };
    } catch (error) {
        console.error('Error al preguntar a AlterMIA:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        return { success: false, error: errorMessage };
    }
}


export async function handleGeneratePresentation(input: GeneratePresentationInput): Promise<{ success: boolean; data?: GeneratePresentationOutput, error?: string }> {
    try {
        if (!input.prompt && !input.projectId) {
             throw new Error('Se requiere un ID de proyecto o un prompt para generar una presentación.');
        }
        const result = await generatePresentation(input);
        return { success: true, data: result };
    } catch (error) {
        console.error('Error generando la presentación:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        return { success: false, error: errorMessage };
    }
}


export async function handleChangePlan(userId: string, newPlan: UserProfile['plan']): Promise<{success: boolean; error?: string}> {
    try {
        if (!userId || !newPlan) {
            throw new Error('Se requieren el ID de usuario y el nuevo plan.');
        }
        await updateUserProfile(userId, { plan: newPlan });
        return { success: true };
    } catch (error) {
        console.error('Error cambiando el plan:', error);
        const errorMessage = error instanceof Error ? error.message : 'Ocurrió un error desconocido.';
        return { success: false, error: errorMessage };
    }
}
