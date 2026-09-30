const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) results = results.concat(walk(file));
    else if (file.endsWith('.tsx') || file.endsWith('.ts')) results.push(file);
  });
  return results;
}

walk('./apps/web/src').forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  if (content.includes('\\${import.meta.env.VITE_API_URL')) {
    content = content.replace(/\\\${import\.meta\.env\.VITE_API_URL/g, '${import.meta.env.VITE_API_URL');
    fs.writeFileSync(file, content);
    console.log('Fixed:', file);
  }
});
