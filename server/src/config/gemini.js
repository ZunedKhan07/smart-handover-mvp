
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

const apiKey = process.env.GEMINI_KEY;

if (!apiKey) {
  throw new Error('GEMINI_KEY is missing from environment variables.');
}

export const GEMINI_MODEL_NAME = 'gemini-3-flash-preview';

const genAI = new GoogleGenerativeAI(apiKey);

export const getGeminiModel = (systemInstruction) => {
  return genAI.getGenerativeModel({
    model: GEMINI_MODEL_NAME,
    systemInstruction,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.2,
      maxOutputTokens: 8192,
    },
  });
};
