const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, '../app/api');

function addExports(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  // Cek apakah sudah ada export const dynamic dan runtime
  if (content.includes('export const dynamic') && content.includes('export const runtime')) return;
  
  let newContent = content;
  // Tambahkan setelah import terakhir atau di awal
  const importEndIndex = content.lastIndexOf('import');
  if (importEndIndex !== -1) {
    const insertPos = content.indexOf('\n', importEndIndex) + 1;
    newContent = content.slice(0, insertPos) + 
      "export const dynamic = 'force-dynamic';\nexport const runtime = 'nodejs';\n" + 
      content.slice(insertPos);
  } else {
    newContent = "export const dynamic = 'force-dynamic';\nexport const runtime = 'nodejs';\n" + content;
  }
  fs.writeFileSync(filePath, newContent);
  console.log(`Updated: ${filePath}`);
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'route.ts') {
      addExports(fullPath);
    }
  }
}

walk(apiDir);
console.log('Done!');