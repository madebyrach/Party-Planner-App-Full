// --- Menu & Shopping List Handler (Serverless Function) ---

import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const model = "gemini-2.5-flash-preview-09-2025";

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') { return res.status(200).end(); }
    if (req.method !== 'POST') { return res.status(405).json({ error: 'Method Not Allowed. Use POST.' }); }
    
    const { guests, partyDetails, appetizers, mainCourses, sideDishes, desserts, beverages, otherItems } = req.body;
    
    if (!guests || !partyDetails) { return res.status(400).json({ error: 'Missing required fields: guests or partyDetails.' }); }

    try {
        const menuItems = [appetizers, mainCourses, sideDishes, desserts, beverages, otherItems].filter(Boolean).join(', ');

        const systemPrompt = `You are a professional caterer and event planner. Your sole task is to generate a comprehensive shopping list (MenuPlan) and a short Summary for an event. You must accurately estimate quantities based on ${guests} guests and the specified items. The output MUST strictly follow the JSON schema.`;
        
        const userQuery = `Event Details: ${partyDetails}. Guest Count: ${guests}. User Menu Suggestions (calculate quantities for these items): ${menuItems}. Generate only the 'Summary' and the 'MenuPlan' array.`;

        const responseSchema = {
            type: "OBJECT",
            properties: {
                Summary: {
                    type: "STRING",
                    description: "A single, concise paragraph summarizing the menu plan, theme, and key logistical notes related to food."
                },
                MenuPlan: {
                    type: "ARRAY",
                    description: "A detailed list of food and beverage items with calculated quantities based on guest count.",
                    items: {
                        type: "OBJECT",
                        properties: {
                            item: { type: "STRING" },
                            quantity: { type: "STRING", description: "The calculated quantity and unit (e.g., '5 lbs', '2 cases', '200 pieces')." },
                            category: { type: "STRING", description: "The type of food/drink (e.g., 'Main Course', 'Appetizer', 'Beverage', 'Supply')." }
                        },
                        required: ["item", "quantity", "category"]
                    }
                },
            },
            required: ["Summary", "MenuPlan"]
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
        console.error("Gemini API Error (Menu):", error);
        res.status(500).json({ 
            MenuPlan: [],
            Summary: "Failed to generate menu and shopping list due to a backend error."
        });
    }
}