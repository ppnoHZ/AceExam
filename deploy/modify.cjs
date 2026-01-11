const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '../Index.html');
const scriptTag = '<script  type="module" src="./index.tsx"></script>';

try {
  let html = fs.readFileSync(indexPath, 'utf-8');

  if (!html.includes(scriptTag)) {
    // Insert the script tag before the closing </body> tag
    if (html.includes('</body>')) {
      html = html.replace('</body>', `  ${scriptTag}\n</body>`);
      fs.writeFileSync(indexPath, html, 'utf-8');
      console.log('Successfully added script tag to index.html');
    } else {
      console.warn('Could not find </body> tag in index.html');
    }
  } else {
    console.log('Script tag already exists in index.html');
  }
} catch (error) {
  console.error('Error modifying index.html:', error);
  process.exit(1);
}
