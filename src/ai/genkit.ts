
import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY }),
  ],
  // Modelo compatible: 'gemini-1.5-flash' puede estar deshabilitado/renombrado según tu API.
  // Cambia a uno existente en tu cuenta (ej: gemini-1.5-pro) o usa el valor por env.
  model: process.env.GENKIT_MODEL ?? 'googleai/gemini-1.5-pro',
});

