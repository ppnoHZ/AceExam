import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dbProvider from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function importData() {
  try {
    const dataPath = path.resolve(__dirname, '../frontend/data.json');
    const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    
    console.log(`[Import] Starting import of ${data.length} questions...`);
    
    const pool = dbProvider.pool;
    
    // Clear existing questions (optional, but good for fresh import)
    // await pool.execute('DELETE FROM questions');
    
    let count = 0;
    for (const item of data) {
      await pool.execute(
        `INSERT INTO questions (
          question_id, type, question_en, question_cn, 
          options_en, options_cn, answer_en, answer_cn,
          explanation_en, explanation_cn
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          type = VALUES(type),
          question_en = VALUES(question_en),
          question_cn = VALUES(question_cn),
          options_en = VALUES(options_en),
          options_cn = VALUES(options_cn),
          answer_en = VALUES(answer_en),
          answer_cn = VALUES(answer_cn),
          explanation_en = VALUES(explanation_en),
          explanation_cn = VALUES(explanation_cn)`,
        [
          item.question_id,
          item.type,
          item.question_en,
          item.question_cn,
          JSON.stringify(item.options_en),
          JSON.stringify(item.options_cn),
          item.answer_en,
          item.answer_cn,
          item.explanation_en || null,
          item.explanation_cn || null
        ]
      );
      count++;
      if (count % 100 === 0) {
        console.log(`[Import] Imported ${count} questions...`);
      }
    }
    
    console.log(`[Import] Successfully imported ${count} questions.`);
    process.exit(0);
  } catch (err) {
    console.error('[Import] Error:', err);
    process.exit(1);
  }
}

// Wait a bit for dbProvider to initialize (it calls init() in constructor)
setTimeout(importData, 1000);
