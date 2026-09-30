const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function(file) {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./apps/web/src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;
  
  // Handle standard string quotes
  content = content.replace(/'http:\/\/localhost:3001(.*?)'/g, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:3001'}$1`");
  content = content.replace(/"http:\/\/localhost:3001(.*?)"/g, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:3001'}$1`");
  
  // Handle template literals (backticks)
  content = content.replace(/`http:\/\/localhost:3001(.*?)`/g, "`\\${import.meta.env.VITE_API_URL || 'http://localhost:3001'}$1`");
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated:', file);
  }
});
