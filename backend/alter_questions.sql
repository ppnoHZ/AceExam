-- Migration script to add explanation columns to the questions table

ALTER TABLE questions ADD COLUMN explanation_en TEXT AFTER answer_cn;
ALTER TABLE questions ADD COLUMN explanation_cn TEXT AFTER explanation_en;
