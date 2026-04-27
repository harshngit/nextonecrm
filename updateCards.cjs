const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.jsx') || file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./src');
let changed = 0;

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let newContent = content.replace(/(className=["'][^"']*?\bbg-card\b[^"']*?\bborder\b)(?![^"']*?\bborder-gray-200\b)/g, '$1 border-gray-200 dark:border-gray-700');
  
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    changed++;
    console.log('Updated', file);
  }
});

console.log('Changed files: ' + changed);
