// --- Decoration Ideas Generator (Serverless Function) ---

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = "gemini-2.5-flash-preview-09-2025";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method Not Allowed. Use POST.' }); }
    
    const { guests, partyDetails } = req.body;
    
    if (!guests || !partyDetails) { return res.status(400).json({ error: 'Missing required fields: guests or partyDetails.' }); }

    try {
        const systemPrompt = `You are a creative party stylist and theme designer. Your task is to generate original decoration ideas that match the event's theme and vibe. Ensure all output strictly follows the required JSON schema.`; 
        
        const userQuery = `Event Details: ${partyDetails}. Guest Count: ${guests}. Generate creative and cohesive decoration ideas for the event.`;

        const responseSchema = {
            type: "OBJECT",
            properties: {
                DecorationIdeas: {
                    type: "ARRAY",
                    description: "Ideas for decorations tailored to the theme/vibe.",
                    items: {
                        type: "OBJECT",
                        properties: {
                            area: { type: "STRING", description: "The area for the decoration (e.g., 'Entrance', 'Tables', 'Photo Booth')." },
                            item: { type: "STRING", description: "The specific decoration item." },
                            style: { type: "STRING", description: "The style or color scheme (e.g., 'Tropical', 'Minimalist Black & Gold')." }
                        },
                        required: ["area", "item", "style"]
                    }
                }
            },
            required: ["DecorationIdeas"]
        };


        const response = await ai.models.generateContent({
            model,
            contents: [{ parts: [{ text: systemPrompt + "\n" + userQuery }] }],
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema
            }
        });
        
        const jsonText = response.candidates?.[0]?.content?.parts?.[0]?.text;
        const parsedJson = JSON.parse(jsonText);

        res.status(200).json(parsedJson);
        
    } catch (error) {
        console.error("Gemini API Error (decorations):", error);
        res.status(500).json({ 
            error: 'Failed to generate Decoration Ideas.',
            details: error.message || 'Unknown backend error.'
        });
    }
}