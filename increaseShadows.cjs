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
  let newContent = content;

  // Make the base shadow more visible
  newContent = newContent.replace(/shadow-sm shadow-gray-200\/50 dark:shadow-\[#0f0f0f\]\/50/g, 'shadow-md shadow-gray-300/50 dark:shadow-gray-900/50');
  
  // Also bump hover slightly so it still transitions
  newContent = newContent.replace(/hover:shadow-md hover:shadow-gray-200\/50 dark:hover:shadow-\[#0f0f0f\]\/50/g, 'hover:shadow-lg hover:shadow-gray-300/50 dark:hover:shadow-gray-900/50');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    changed++;
    console.log('Updated shadows in', file);
  }
});

console.log('Modified files: ' + changed);
