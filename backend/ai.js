import dotenv from 'dotenv';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ProxyAgent, setGlobalDispatcher } from 'undici';

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);

dotenv.config({
  path: nodePath.resolve(__dirname, '.env'),
  override: true,
});

// Setup proxy if available from environment
const proxyUrl = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.HTTP_PROXY || process.env.http_proxy;
if (proxyUrl) {
  console.log(`[AI] Configuring global proxy: ${proxyUrl}`);
  const proxyAgent = new ProxyAgent(proxyUrl);
  setGlobalDispatcher(proxyAgent);
}

const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = process.env.GEMINI_BASE_URL;
const MODEL = process.env.GEMINI_MODEL || 'gemini-3-flash-preview';

// Initialize the SDK
const genAI = new GoogleGenerativeAI(API_KEY, { baseUrl: BASE_URL });

export async function generateMemoryAid(question) {
  if (!API_KEY) {
    throw new Error('GEMINI_API_KEY is not defined in environment.');
  }

  const model = genAI.getGenerativeModel({ 
    model: MODEL,
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const prompt = `
You are an expert tutor. Given a question and its correct answer, generate a concise, creative, and effective memory aid (mnemonic) or a short explanation to help the student remember the answer.
You should provide the response in both English and Chinese.
The output should be HTML formatted. 
- Use <b> or <strong> to highlight key words.
- Use <ul> and <li> for lists if applicable.
- Use <code> for technical terms or code snippets.
- Use <br/> for line breaks.

Question:
EN: ${question.question_en}
CN: ${question.question_cn}

Options (Labels and Values):
EN: ${JSON.stringify(question.options_en)}
CN: ${JSON.stringify(question.options_cn)}

Answer Key:
EN/CN: ${question.answer_en}

Please format your response as a JSON object with two keys: "memory_aid_en" and "memory_aid_cn".
Each value should be a string containing the HTML formatted memory aid.
Example response:
{
  "memory_aid_en": "Remember <b>ACID</b> for database transactions: <b>A</b>tomicity, <b>C</b>onsistency, <b>I</b>solation, <b>D</b>urability.",
  "memory_aid_cn": "记住数据库事务的 <b>ACID</b> 特性：<b>A</b> 原子性，<b>C</b> 一致性，<b>I</b> 隔离性，<b>D</b> 持久性。"
}
Do not include any markdown formatting like \`\`\`json outside the JSON object.
`;

  console.log(`[AI] Calling Gemini SDK with model: ${MODEL}`);

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    console.log('[AI] Generated memory aid:', text);
    return JSON.parse(text);
  } catch (err) {
    console.error('[AI] Error in generateMemoryAid:', err);
    throw err;
  }
}
