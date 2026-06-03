import fs from 'fs';
let code = fs.readFileSync('src/components/Game.tsx', 'utf8');

// The file now has `const [latestMove, setLatestMove] = useState<Move | null>(null);`
code = code.replace(/const \[latestMove, setLastCpuMove\] = useState<Move \| null>\(null\);/g, '');

// Also `setLastCpuMove` might be `setLatestMove` or something?
// Let's just remove the first 170 lines' timer effect which we know has `setLastCpuMove` string? No, `lastCpuMove` became `latestMove` globally.
code = code.replace(/setLastCpuMove/g, 'setLatestMove');

fs.writeFileSync('src/components/Game.tsx', code);
