// --- Day-of Schedule Generator (Serverless Function) ---

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
        const systemPrompt = `You are a meticulous event floor manager. Your task is to generate a detailed, hour-by-hour schedule for the event day, covering setup, guest arrival, main activities, and breakdown. Ensure all output strictly follows the required JSON schema.`; 
        
        const userQuery = `Event Details: ${partyDetails}. Guest Count: ${guests}. Generate a precise day-of schedule starting from setup until final cleanup.`;

        const responseSchema = {
            type: "OBJECT",
            properties: {
                Timeline: {
                    type: "ARRAY",
                    description: "A detailed schedule for the day of the event.",
                    items: {
                        type: "OBJECT",
                        properties: {
                            time: { type: "STRING", description: "The specific time or time range (e.g., '4:00 PM', '5:30 PM - 6:30 PM')." },
                            activity: { type: "STRING", description: "The activity or event happening." }
                        },
                        required: ["time", "activity"]
                    }
                }
            },
            required: ["Timeline"]
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
        console.error("Gemini API Error (timeline):", error);
        res.status(500).json({ 
            error: 'Failed to generate Day-of Schedule.',
            details: error.message || 'Unknown backend error.'
        });
    }
}