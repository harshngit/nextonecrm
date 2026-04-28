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

  // We find classNames that are for cards (bg-card or bg-white with rounded-xl/2xl and border)
  // and we make sure shadow-gray-200/50 is applied.
  
  // A simple way is to replace `shadow-sm` with `shadow-sm shadow-gray-200/50 dark:shadow-[#0f0f0f]/50`
  // But we only want to do it on lines that have bg-card or bg-white.
  
  const lines = newContent.split('\n');
  const newLines = lines.map(line => {
    if ((line.includes('bg-card') || line.includes('bg-white')) && line.includes('border') && (line.includes('rounded-xl') || line.includes('rounded-2xl'))) {
      if (line.includes('shadow-sm') && !line.includes('shadow-gray-200/50')) {
        line = line.replace(/shadow-sm(?! shadow-gray-200\/50)/g, 'shadow-sm shadow-gray-200/50 dark:shadow-[#0f0f0f]/50');
      }
      if (line.includes('hover:shadow-md') && !line.includes('hover:shadow-gray-200/50')) {
        line = line.replace(/hover:shadow-md(?! hover:shadow-gray-200\/50)/g, 'hover:shadow-md hover:shadow-gray-200/50 dark:hover:shadow-[#0f0f0f]/50');
      }
    }
    return line;
  });
  
  newContent = newLines.join('\n');

  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    changed++;
    console.log('Added shadow to', file);
  }
});

console.log('Modified files: ' + changed);
