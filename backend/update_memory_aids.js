import dbProvider from './database.js';
import { generateMemoryAid } from './ai.js';

console.log('[Script] Starting memory aid update process...');

try {
  const questions = await dbProvider.getAllQuestions();
  console.log(`[Script] Found ${questions.length} questions.`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (const question of questions) {
    // Skip if already has an explanation (optional: remove this check to force update all)
    if (question.explanation_en && question.explanation_cn) {
      console.log(`[Script] Question ${question.question_id} already has an explanation. Skipping.`);
      skippedCount++;
      continue;
    }

    console.log(`[Script] Generating memory aid for question ${question.question_id}...`);
    
    try {
      const aid = await generateMemoryAid(question);
      
      await dbProvider.updateQuestionExplanation(
        question.question_id,
        aid.memory_aid_en,
        aid.memory_aid_cn
      );

      updatedCount++;
      console.log(`[Script] Successfully updated question ${question.question_id}.`);
      
      // Anti-rate limit delay (adjust as needed for your Gemini tier)
      await new Promise(resolve => setTimeout(resolve, 2000)); 
    } catch (err) {
      console.error(`[Script] Error updating question ${question.question_id}:`, err.message);
      errorCount++;
      // If it's a rate limit error, we might want to wait longer
      if (err.message.includes('429')) {
        console.log('[Script] Rate limit hit. Waiting 30 seconds...');
        await new Promise(resolve => setTimeout(resolve, 30000));
      }
    }
  }

  console.log(`[Script] Update complete.`);
  console.log(`[Summary] Total: ${questions.length}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
  
  process.exit(0);
} catch (err) {
  console.error('[Script] Fatal error:', err);
  process.exit(1);
}
