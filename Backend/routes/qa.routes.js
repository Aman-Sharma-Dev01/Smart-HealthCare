// routes/qa.routes.js
import 'dotenv/config';
import express from 'express';
import { VertexAI } from '@google-cloud/vertexai';

const router = express.Router();

// --- Vertex AI Configuration ---
// Make sure your GCP Project ID is correct here
const vertex_ai = new VertexAI({ project: 'alpine-aspect-459412-p7', location: 'us-central1' });
const model = 'gemini-1.0-pro';
const generativeModel = vertex_ai.getGenerativeModel({ model });

// --- Define the POST endpoint ---
router.post('/', async (req, res, next) => {
    const { context, question } = req.body;

    if (!context || !question) {
        // This is a more robust way to send an error
        const error = new Error('Context and question are required.');
        error.statusCode = 400;
        return next(error);
    }

    const prompt = `
    Context: "${context}"
    Based ONLY on the context provided, answer the following question.
    Question: "${question}"
    `;

    try {
        const resp = await generativeModel.generateContent(prompt);
        const response = await resp.response;
        const answer = response.candidates[0].content.parts[0].text;
        res.json({ answer: answer.trim() });
    } catch (error) {
        // Pass the error to the global error handler
        error.message = `Failed to get answer from Vertex AI: ${error.message}`;
        next(error);
    }
});

export default router;