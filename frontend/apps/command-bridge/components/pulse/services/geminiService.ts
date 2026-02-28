
import { GoogleGenAI, Type } from "@google/genai";
import { PulseClient } from './PulseClient';

// Use Vite environment variable instead of process.env
const apiKey = (import.meta as any).env?.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

// PulseClient for agentic operations
const pulseClient = new PulseClient();

// Always Agentic - Steve is fully capable
export const isAgenticMode = () => true;

export const generateAgenticBlueprint = async (prompt: string, existingFiles: any[] = [], projectContext: any = {}) => {
  // AGENTIC MODE: Multi-arbiter coordination
  // Uses: ReasoningChamber -> CodeObservationArbiter -> EngineeringSwarmArbiter -> SteveArbiter
  try {
    console.log('[Blueprint] 🎨 Using SOMA AGENTIC mode');
    const result = await pulseClient.generateAgenticBlueprint(prompt, existingFiles, projectContext);
    
    if (result.success) {
      return {
        explanation: result.explanation,
        files: result.blueprint || [],
        arbitersUsed: result.arbitersUsed || [],
        workflow: result.workflow,
        agenticMode: true
      };
    } else {
      console.error('[Blueprint] Agentic mode failed:', result.error);
      throw new Error(result.error || "Blueprint generation failed");
    }
  } catch (error) {
    console.error('[Blueprint] Agentic mode error:', error);
    throw error;
  }
};

export const getTerminalAssistance = async (input: string, context: string) => {
  // We still use a quick direct call for terminal intent classification as it needs to be instant
  // and doesn't require deep system state. 
  // Alternatively, we could route this to 'ReasoningChamber' if latency permits.
  // For now, keeping this lightweight helper is fine, as it just *routes* to the heavy lifters.
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Terminal assistant for Pulse Terminal. Input: "${input}". Path: "${context}". 
    If the user wants to "make", "create", or "build" a website/app, respond with a JSON indicating a "blueprint_intent".
    Otherwise, provide standard terminal help.
    Output JSON:
    - intent: "help" | "blueprint_intent"
    - suggestion: brief text
    - explanation: detailed text
    - code: if relevant
    - language: string`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          intent: { type: Type.STRING },
          suggestion: { type: Type.STRING },
          explanation: { type: Type.STRING },
          code: { type: Type.STRING },
          language: { type: Type.STRING }
        }
      }
    }
  });
  return JSON.parse(response.text || '{}');
};

export const getSteveResponse = async (message: string, history: { role: string, content: string }[], context: any) => {
  // AGENTIC MODE: Route through PulseArbiter -> SteveArbiter -> SOMA ecosystem
  try {
    console.log('[Steve] 🤖 Using SOMA AGENTIC mode');
    const result = await pulseClient.steveAgentic(message, history, context);
    
    if (result.success) {
      return {
        response: result.response,
        actions: result.actions || [],
        updatedFiles: result.updatedFiles || [],
        arbitersConsulted: result.arbitersConsulted || ['SteveArbiter'],
        agenticMode: true
      };
    } else {
      console.error('[Steve] Agentic mode failed:', result.error);
      return { 
        response: `My cognitive link to SOMA is unresponsive: ${result.error}`, 
        actions: [], 
        updatedFiles: [],
        agenticMode: true
      };
    }
  } catch (error) {
    console.error('[Steve] Agentic mode error:', error);
    return { 
      response: "I lost my connection to the Arbiters. Please check the backend.", 
      actions: [], 
      updatedFiles: [],
      agenticMode: true
    };
  }
};
