-- AceExam Database Schema

-- Questions answers log table
CREATE TABLE IF NOT EXISTS answers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  fingerprint VARCHAR(255) NOT NULL COMMENT 'Unique browser fingerprint',
  socket_id VARCHAR(255) NOT NULL COMMENT 'Current socket connection ID',
  question_id INT NOT NULL COMMENT 'ID of the question answered',
  is_correct BOOLEAN NOT NULL COMMENT 'Whether the answer was correct',
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Time of answer',
  
  -- Optimization indexes
  INDEX idx_fingerprint (fingerprint),
  INDEX idx_is_correct (is_correct),
  INDEX idx_timestamp (timestamp)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  question_id INT PRIMARY KEY,
  type VARCHAR(50) NOT NULL,
  question_en TEXT NOT NULL,
  question_cn TEXT NOT NULL,
  options_en JSON NOT NULL,
  options_cn JSON NOT NULL,
  answer_en VARCHAR(255) NOT NULL,
  answer_cn VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
