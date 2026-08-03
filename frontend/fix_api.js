const fs = require('fs');
let code = fs.readFileSync('lib/api/professional-services.ts', 'utf8');

// Fix 1: fetchApi should return unwrapped data or raw json
code = code.replace(
  /const json = await res\.json\(\);\n  return json\.data;/g,
  "const json = await res.json();\n  return (json && typeof json === 'object' && 'data' in json) ? (json as any).data : json;"
);

// Fix 2: Replace all `const { data } = await fetchApi<{ data: ... }>` with `const data = await fetchApi<...>`
code = code.replace(/const \{ data \} = await fetchApi<\{ data: (.*?) \}>\(/g, 'const data = await fetchApi<$1>(');

fs.writeFileSync('lib/api/professional-services.ts', code);
console.log('Fixed API calls');
