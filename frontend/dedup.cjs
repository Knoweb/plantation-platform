const fs = require('fs');
const path = './src/context/LanguageContext.tsx';
let content = fs.readFileSync(path, 'utf8');

const seen = new Set();
const lines = content.split(/\r?\n/);
const newLines = [];

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Match line like: 'Something': { si: '...' },
    // Also match double quotes
    const match = line.match(/^\s*['"](.*?)['"]\s*:\s*\{/);
    if (match) {
        // Normalize the key by converting to lowercase and trimming
        const key = match[1].toLowerCase().trim();
        if (seen.has(key)) {
            // Duplicate found, skip
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
console.log('Removed all duplicate keys.');
