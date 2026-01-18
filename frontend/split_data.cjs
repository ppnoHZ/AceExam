const fs = require('fs');
const path = require('path');

// 配置
const INPUT_FILE = 'data.json';
const OUTPUT_DIR = 'split_data';
const RECORDS_PER_FILE = 20;

// 读取原始数据
console.log('正在读取文件:', INPUT_FILE);
const rawData = fs.readFileSync(INPUT_FILE, 'utf-8');
const data = JSON.parse(rawData);

console.log(`总共有 ${data.length} 条记录`);

// 创建输出目录
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`创建目录: ${OUTPUT_DIR}`);
}

// 计算需要创建的文件数量
const totalFiles = Math.ceil(data.length / RECORDS_PER_FILE);
console.log(`将拆分为 ${totalFiles} 个文件\n`);

// 拆分数据并写入文件
for (let i = 0; i < totalFiles; i++) {
  const start = i * RECORDS_PER_FILE;
  const end = Math.min(start + RECORDS_PER_FILE, data.length);
  const chunk = data.slice(start, end);
  
  // 文件名格式：data_001.json, data_002.json, ...
  const fileName = `data_${String(i + 1).padStart(3, '0')}.json`;
  const filePath = path.join(OUTPUT_DIR, fileName);
  
  // 写入文件（格式化输出，便于阅读）
  fs.writeFileSync(filePath, JSON.stringify(chunk, null, 2), 'utf-8');
  
  console.log(`✓ ${fileName}: 包含 ${chunk.length} 条记录 (ID: ${chunk[0].question_id} - ${chunk[chunk.length - 1].question_id})`);
}

console.log(`\n完成！所有文件已保存到 ${OUTPUT_DIR} 目录`);
