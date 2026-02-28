import { GoogleGenAI, Type } from "@google/genai";

const getClient = () => {
    // Safe access to process.env and import.meta.env
    let apiKey = undefined;
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
        apiKey = process.env.API_KEY;
    } else if (import.meta && import.meta.env && import.meta.env.VITE_API_KEY) {
        apiKey = import.meta.env.VITE_API_KEY;
    }

    if (!apiKey) {
        console.warn("API Key missing in environment");
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

export const analyzeMarketAtmosphere = async (data, activeProtocol = 'UNKNOWN') => {
    const ai = getClient();
    if (!ai) return null;

    // Simplify data for token efficiency
    const recentData = data.slice(-50).map(p => ({
        c: p.close.toFixed(2),
        v: p.volume
    }));

    const prompt = `
    You are 'Market View', a cyberpunk market observer and strategist.
    
    CONTEXT:
    - Active Protocol: "${activeProtocol}"
    - Task: Analyze market structure and advise the active protocol on tactical adaptations.
    
    Analyze this sequence of market price data.
    1. Describe the "shape" and "weather" of the market terrain.
    2. PROJECT 4 distinct future scenarios (20 points each) based on the data.
       CRITICAL: Ensure the first point of every prediction is close to the last data point.
    3. ADVISE specific behavioral changes for the "${activeProtocol}" strategy based on this terrain (e.g., "Tighten stops", "Increase aggression", "Hedge now").
    
    Use terms like: Ridge, Valley, Flow, Fracture, Tension, Bloom, Static, Void.
  `;

    // Define schema for strict JSON output
    const schema = {
        type: Type.OBJECT,
        properties: {
            atmosphere: {
                type: Type.STRING,
                description: "A single uppercase word describing the vibe (e.g. ELECTRIC, DORMANT, FRACTURED)."
            },
            poeticState: {
                type: Type.STRING,
                description: "A short, haiku-like sentence describing the movement pattern visually."
            },
            protocolAdaptation: {
                type: Type.STRING,
                description: "A tactical directive for the active protocol (max 5 words, uppercase). E.g. 'ENGAGE DEFENSIVE SUB-ROUTINES' or 'MAXIMIZE ALPHA CAPTURE'."
            },
            predictions: {
                type: Type.ARRAY,
                description: "Four distinct projected price paths: SAFE, BREAKOUT, DROP, and AVERAGE.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { type: Type.STRING, enum: ['SAFE', 'BREAKOUT', 'AVERAGE', 'DROP'] },
                        data: { type: Type.ARRAY, items: { type: Type.NUMBER } }
                    },
                    required: ['type', 'data']
                }
            }
        },
        required: ["atmosphere", "poeticState", "predictions", "protocolAdaptation"]
    };

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.0-flash-exp',
            contents: [
                { role: 'user', parts: [{ text: prompt }, { text: `DATA_PACKET: ${JSON.stringify(recentData)}` }] }
            ],
            config: {
                responseMimeType: 'application/json',
                responseSchema: schema
            }
        });

        const text = response.text();
        if (!text) return null;
        return JSON.parse(text);
    } catch (error) {
        console.error("Gemini interpretation failed:", error);
        return null;
    }
};
