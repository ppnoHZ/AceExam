import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import nodePath from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = nodePath.dirname(__filename);

dotenv.config({
  path: nodePath.resolve(__dirname, '.env'),
  override: true,
});

if (process.env.DB_PASSWORD) {
  console.log('[DB] Environment variables loaded successfully.');
} else {
  console.warn('[DB] Warning: DB_PASSWORD is not defined in environment.');
}

const SCHEMA_DDL_ANSWERS = `
  CREATE TABLE IF NOT EXISTS answers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    fingerprint VARCHAR(255) NOT NULL,
    socket_id VARCHAR(255) NOT NULL,
    question_id INT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_fingerprint (fingerprint),
    INDEX idx_is_correct (is_correct),
    INDEX idx_timestamp (timestamp)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const SCHEMA_DDL_QUESTIONS = `
  CREATE TABLE IF NOT EXISTS questions (
    question_id INT PRIMARY KEY,
    type VARCHAR(50) NOT NULL,
    question_en TEXT NOT NULL,
    question_cn TEXT NOT NULL,
    options_en JSON NOT NULL,
    options_cn JSON NOT NULL,
    answer_en VARCHAR(255) NOT NULL,
    answer_cn VARCHAR(255) NOT NULL,
    explanation_en TEXT,
    explanation_cn TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

class MySQLProvider {
  constructor() {
    this.pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: Number.parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
    this.init();
  }

  async init () {
    try {
      // Create tables if not exists
      await this.pool.execute(SCHEMA_DDL_ANSWERS);
      await this.pool.execute(SCHEMA_DDL_QUESTIONS);

      // Ensure explanation columns exist
      try {
        await this.pool.execute('ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation_en TEXT');
        await this.pool.execute('ALTER TABLE questions ADD COLUMN IF NOT EXISTS explanation_cn TEXT');
      } catch (error_) {
        // Some older MySQL versions don't support ADD COLUMN IF NOT EXISTS
        console.log('[DB] Checking columns manually...', error_.message);
        const [cols] = await this.pool.execute('SHOW COLUMNS FROM questions');
        const hasEn = cols.some(c => c.Field === 'explanation_en');
        const hasCn = cols.some(c => c.Field === 'explanation_cn');
        if (!hasEn) await this.pool.execute('ALTER TABLE questions ADD COLUMN explanation_en TEXT');
        if (!hasCn) await this.pool.execute('ALTER TABLE questions ADD COLUMN explanation_cn TEXT');
      }

      console.log('[DB] MySQL initialized and tables verified.');
    } catch (err) {
      console.error('[DB] Failed to initialize MySQL:', err.message);
      console.warn('[DB] Please ensure the database "aceexam" exists and user has permissions.');
    }
  }

  async saveAnswer ({ fingerprint, socketId, questionId, isCorrect }) {
    try {
      const [result] = await this.pool.execute(
        'INSERT INTO answers (fingerprint, socket_id, question_id, is_correct) VALUES (?, ?, ?, ?)',
        [fingerprint, socketId, questionId, isCorrect ? 1 : 0]
      );
      return result;
    } catch (err) {
      console.error('[DB] Error saving answer:', err);
      throw err;
    }
  }

  async getStats () {
    try {
      const [[stats]] = await this.pool.execute(`
        SELECT 
          COUNT(*) as totalAnswers,
          SUM(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) as correctAnswers,
          COUNT(DISTINCT fingerprint) as uniqueUsers
        FROM answers
      `);

      const totalAnswers = stats.totalAnswers || 0;
      const correctAnswers = stats.correctAnswers || 0;
      const uniqueUsers = stats.uniqueUsers || 0;

      return {
        totalAnswers,
        correctAnswers,
        accuracy: totalAnswers > 0 ? (correctAnswers / totalAnswers * 100).toFixed(2) : 0,
        uniqueUsersInDb: uniqueUsers
      };
    } catch (err) {
      console.error('[DB] Error getting stats:', err);
      throw err;
    }
  }

  async getAllQuestions () {
    try {
      const [rows] = await this.pool.execute(
        'SELECT * FROM questions ORDER BY question_id ASC'
      );
      return rows;
    } catch (err) {
      console.error('[DB] Error getting all questions:', err);
      throw err;
    }
  }

  async getQuestionById (questionId) {
    try {
      const [[question]] = await this.pool.execute(
        'SELECT * FROM questions WHERE question_id = ?',
        [questionId]
      );
      return question;
    } catch (err) {
      console.error('[DB] Error getting question by ID:', err);
      throw err;
    }
  }

  async updateQuestionExplanation (questionId, explanationEn, explanationCn) {
    try {
      await this.pool.execute(
        'UPDATE questions SET explanation_en = ?, explanation_cn = ? WHERE question_id = ?',
        [explanationEn, explanationCn, questionId]
      );
    } catch (err) {
      console.error('[DB] Error updating question explanation:', err);
      throw err;
    }
  }
}

const dbProvider = new MySQLProvider();
export default dbProvider;
