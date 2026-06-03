import fs from 'fs';
let code = fs.readFileSync('src/components/Game.tsx', 'utf8');

const lines = code.split('\n');

// 1. Remove useState line
const filteredLines = lines.filter(l => !l.includes('const [latestMove, setLastCpuMove]'));

code = filteredLines.join('\n');

// 2. Remove the cpu moves check block
const cpuBlockStart = code.indexOf('// Detect CPU move change');
if (cpuBlockStart > -1) {
  const cpuBlockEnd = code.indexOf('} else {', cpuBlockStart);
  if (cpuBlockEnd > -1) {
     // I will just use regex to remove setLastCpuMove calls.
  }
}

code = code.replace(/setLastCpuMove\([^)]*\);?/g, '');
code = code.replace(/setLastCpuMove\(current => \{[\s\S]*?\}\);/g, '');

// 3. The timer for lastCpuMove which is now latestMove timer:
code = code.replace(/useEffect\(\(\) => \{\s*if \(latestMove\) \{\s*const timer = setTimeout\(\(\) => \([^)]*\), 6000\);\s*return \(\) => clearTimeout\(timer\);\s*\}\s*\}, \[latestMove\]\);/g, '');


fs.writeFileSync('src/components/Game.tsx', code);
