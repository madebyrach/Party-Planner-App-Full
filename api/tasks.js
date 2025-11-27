// --- Pre-Event To-Do's Generator (Serverless Function) ---

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
        const systemPrompt = `You are a professional event coordinator. Your task is to generate a chronological list of essential tasks and deadlines required in the weeks leading up to the event. Focus on logistics, RSVPs, and preparation. Ensure all output strictly follows the required JSON schema.`; 
        
        const userQuery = `Event Details: ${partyDetails}. Guest Count: ${guests}. Generate a task list leading up to the event day.`;

        const responseSchema = {
            type: "OBJECT",
            properties: {
                TaskList: {
                    type: "ARRAY",
                    description: "A list of critical tasks to complete before the event day.",
                    items: {
                        type: "OBJECT",
                        properties: {
                            deadline: { type: "STRING", description: "When the task should be completed (e.g., '1 Week Before', 'Day Before')." },
                            task: { type: "STRING", description: "The specific task description." }
                        },
                        required: ["deadline", "task"]
                    }
                }
            },
            required: ["TaskList"]
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
        console.error("Gemini API Error (tasks):", error);
        res.status(500).json({ 
            error: 'Failed to generate Pre-Event To-Do List.',
            details: error.message || 'Unknown backend error.'
        });
    }
}