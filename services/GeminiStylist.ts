
import { GoogleGenAI, Type } from "@google/genai";
import { EffectSettings } from "../types";

export class GeminiStylist {
  private ai: GoogleGenAI;

  constructor() {
    this.ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  }

  async generateStyle(prompt: string): Promise<EffectSettings> {
    const response = await this.ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Generate audio DSP settings for a voice modulator to sound like: "${prompt}". 
      Return values in the following ranges:
      - pitch: -12 to 12
      - robotFreq: 0 to 100
      - distortion: 0 to 1
      - filterFreq: 500 to 15000
      - gain: 0.8 to 1.5
      - dryWet: 0 to 1`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            pitch: { type: Type.NUMBER },
            robotFreq: { type: Type.NUMBER },
            distortion: { type: Type.NUMBER },
            filterFreq: { type: Type.NUMBER },
            gain: { type: Type.NUMBER },
            dryWet: { type: Type.NUMBER },
            bypass: { type: Type.BOOLEAN }
          },
          required: ['pitch', 'robotFreq', 'distortion', 'filterFreq', 'gain', 'dryWet', 'bypass']
        }
      }
    });

    const result = JSON.parse(response.text);
    return result as EffectSettings;
  }
}
