const fs = require('fs');

function fixFile(file) {
  let lines = fs.readFileSync(file, 'utf8').split('\n');
  let currentParams = ['id'];
  
  for (let i = 0; i < lines.length; i++) {
    const routeMatch = lines[i].match(/router\.(get|post|put|delete)\('([^']+)'/);
    if (routeMatch) {
      const url = routeMatch[2];
      const params = [...url.matchAll(/:([a-zA-Z0-9_]+)/g)].map(m => m[1]);
      if (params.length > 0) {
        currentParams = params;
      }
    }
    
    if (lines[i].includes('String(req.params.id)')) {
      let replaced = lines[i].replace(/([a-zA-Z0-9_]+)\s*:\s*String\(req\.params\.id\)/g, (match, p1) => {
        if (p1 === 'id' || p1 === 'quizId' || p1 === 'roundId' || p1 === 'scoreId' || p1 === 'branchId' || p1 === 'questionId' || p1 === 'participantId') {
          return `${p1}: String(req.params.${p1})`;
        }
        return match;
      });
      
      // If still exists because it's not in the object format, e.g. req.params.id passed directly
      if (replaced.includes('String(req.params.id)')) {
        // Just replace with the most likely param from currentParams
        const bestParam = currentParams[currentParams.length - 1]; // last one is usually the most relevant
        replaced = replaced.replace(/String\(req\.params\.id\)/g, `String(req.params.${bestParam})`);
      }
      
      lines[i] = replaced;
    }
  }
  fs.writeFileSync(file, lines.join('\n'));
}

fixFile('apps/api/src/routes/quiz.routes.ts');
fixFile('apps/api/src/routes/participant.routes.ts');
console.log('Fixed');
