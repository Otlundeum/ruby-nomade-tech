
import { GoogleGenAI } from "@google/genai";
import { Message } from "./types";
import { SYSTEM_PROMPT_BASE, COMPANY_NAME } from "./constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getGeminiResponse = async (
  history: Message[],
  currentTime: string,
  selectedService?: string
) => {
  try {
    const systemInstruction = `
      ${SYSTEM_PROMPT_BASE}
      
      CONTEXTE EN TEMPS RÉEL:
      - Entreprise: ${COMPANY_NAME}
      - Heure locale du client: ${currentTime}
      ${selectedService ? `- Service sélectionné: ${selectedService}` : ''}
    `;

    const formattedHistory = history.length > 0 
      ? history.map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model' as any,
          parts: [{ text: msg.content }]
        }))
      : [{ role: 'user', parts: [{ text: "Bonjour" }] }];

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: formattedHistory.slice(-10),
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.7,
      },
    });

    return response.text;
  } catch (error) {
    console.error("Erreur API Gemini:", error);
    return "Je rencontre une légère perturbation technique. Veuillez m'excuser et réessayer dans un instant.";
  }
};
