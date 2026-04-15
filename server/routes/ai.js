const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/authMiddleware');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

router.post('/generate-description', requireAuth, async (req, res) => {
    const { year, make, model, userPrompt } = req.body;

    if (!year || !make || !model) {
        return res.status(400).json({ message: 'Year, make, and model are required' });
    }

    try {
        const generationModel = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

        let prompt = `Write a compelling, professional car listing description for a ${year} ${make} ${model}. 
The description should be 2-3 paragraphs, highlight the vehicle's appeal, and be written in a friendly but professional tone suitable for a car marketplace listing.
Do not include a title or heading — just the description text.
Do not use markdown formatting.`;

        if (userPrompt) {
            prompt += `\n\nThe seller has the following additional instructions or details: "${userPrompt}"`;
        }

        const result = await generationModel.generateContent(prompt);
        const description = result.response.text();

        res.json({ description: description.trim() });
    } catch (err) {
        console.error('AI generation error:', err);
        res.status(500).json({ message: 'Failed to generate description. Make sure GEMINI_API_KEY is set in .env' });
    }
});

module.exports = router;
