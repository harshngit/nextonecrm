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
  
  // Fix the mangled text
  let newContent = content;
  
  newContent = newContent.replace(/border border border-gray-200 dark:border-gray-700-gray-200 dark:border-gray-700/g, 'border border-gray-200 dark:border-gray-700');
  newContent = newContent.replace(/border border border-gray-200 dark:border-gray-700/g, 'border border-gray-200 dark:border-gray-700');
  newContent = newContent.replace(/border border-gray-200 dark:border-gray-700-gray-200 dark:border-gray-700/g, 'border border-gray-200 dark:border-gray-700');
  newContent = newContent.replace(/border border-gray-200 dark:border-gray-200 dark:border-gray-700/g, 'border border-gray-200 dark:border-gray-700');
  newContent = newContent.replace(/border border-gray-200 dark:border-gray-700 dark:border-gray-700/g, 'border border-gray-200 dark:border-gray-700');
  
  // Cleanup any repeated border border
  newContent = newContent.replace(/border border border/g, 'border');
  newContent = newContent.replace(/border border border-gray-200/g, 'border border-gray-200');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    changed++;
    console.log('Fixed', file);
  }
});

console.log('Fixed files: ' + changed);
