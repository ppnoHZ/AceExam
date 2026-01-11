const fs = require('fs');
const path = require('path');

const indexPath = path.resolve(__dirname, '../index.html');
const scriptTag = '<script type="module" src="./Index.tsx"></script>';

try {
  let html = fs.readFileSync(indexPath, 'utf-8');

  if (!html.includes(scriptTag)) {
    // Insert the script tag before the closing </head> tag
    if (html.includes('</head>')) {
      html = html.replace('</head>', `  ${scriptTag}\n</head>`);
      fs.writeFileSync(indexPath, html, 'utf-8');
      console.log('Successfully added script tag to index.html');
    } else {
      console.warn('Could not find </head> tag in index.html');
    }
  } else {
    console.log('Script tag already exists in index.html');
  }
} catch (error) {
  console.error('Error modifying index.html:', error);
  process.exit(1);
}
