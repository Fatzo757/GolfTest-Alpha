import fs from 'fs';
let code = fs.readFileSync('src/components/Game.tsx', 'utf8');

// Replace all instances of lastCpuMove with latestMove
code = code.replace(/lastCpuMove/g, 'latestMove');

// Wait... in Game.tsx we have `const [lastCpuMove, setLastCpuMove] = useState`
// I already replaced `setLastCpuMove` in memory? Wait, no I didn't replace `setLastCpuMove` yet.

// Let's remove the setLastCpuMove useState completely
code = code.replace(/const \[lastCpuMove, setLastCpuMove\] = useState<Move \| null>\(null\);/g, '');

// Removing the timer effect for lastCpuMove
code = code.replace(/useEffect\(\(\) => {\s*if \(latestMove\) {\s*const timer = setTimeout\(\(\) => setLastCpuMove\(null\), 6000\);\s*return \(\) => clearTimeout\(timer\);\s*}\s*}, \[latestMove\]\);/g, '');

// Replace in parsing the moves
code = code.replace(/setLastCpuMove\(current => {\s*if \(!current \|\| current.id !== latestCpuMove.id\) {\s*return latestCpuMove;\s*}\s*return current;\s*}\);/g, '');


fs.writeFileSync('src/components/Game.tsx', code);
