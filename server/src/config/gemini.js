import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const apiKey = process.env.GEMINI_KEY;

if (!apiKey) {
    throw new Error('GEMINI_KEY is missing from environment variables.');
}

const genAI = new GoogleGenerativeAI(apiKey);

export const model = genAI.getGenerativeModel({
    model: 'gemini-3-flash-preview',
    generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.2,
        maxOutputTokens: 8192
    }
});