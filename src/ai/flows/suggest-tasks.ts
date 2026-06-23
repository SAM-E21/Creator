// A Genkit Flow that suggests relevant subtasks when creating a new task in a project.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestTasksInputSchema = z.object({
  taskDescription: z.string().describe('The description of the task for which subtasks are to be suggested.'),
  projectContext: z.string().describe('Additional context about the project to tailor the subtask suggestions.').optional(),
});
export type SuggestTasksInput = z.infer<typeof SuggestTasksInputSchema>;

const SuggestTasksOutputSchema = z.object({
  subtasks: z.array(z.string()).describe('An array of suggested subtasks for the given task.'),
});
export type SuggestTasksOutput = z.infer<typeof SuggestTasksOutputSchema>;

export async function suggestTasks(input: SuggestTasksInput): Promise<SuggestTasksOutput> {
  return suggestTasksFlow(input);
}

const suggestTasksPrompt = ai.definePrompt({
  name: 'suggestTasksPrompt',
  input: {schema: SuggestTasksInputSchema},
  output: {schema: SuggestTasksOutputSchema},
  prompt: `You are an AI assistant designed to suggest subtasks for a given task within a project.\n\n  Given the following task description and project context (if available), generate a list of subtasks that would be helpful to complete the task.\n\n  Task Description: {{{taskDescription}}}\n  Project Context: {{#if projectContext}}{{{projectContext}}}{{else}}No project context provided.{{/if}}\n\n  Please provide the subtasks as a JSON array of strings.\n  `,
});

const suggestTasksFlow = ai.defineFlow(
  {
    name: 'suggestTasksFlow',
    inputSchema: SuggestTasksInputSchema,
    outputSchema: SuggestTasksOutputSchema,
  },
  async input => {
    const {output} = await suggestTasksPrompt(input);
    return output!;
  }
);
