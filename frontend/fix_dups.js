const fs = require('fs');
const path = './src/context/LanguageContext.tsx';
let content = fs.readFileSync(path, 'utf8');

const seen = new Set();
const lines = content.split(/\r?\n/);
const newLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = line.match(/^\s*['"](.*?)['"]\s*:\s*\{/);
    if (match) {
        const key = match[1];
        if (seen.has(key)) {
            continue;
        } else {
            seen.add(key);
            newLines.push(line);
        }
    } else {
        newLines.push(line);
    }
}

fs.writeFileSync(path, newLines.join('\n'));
