import fs from 'fs';
let code = fs.readFileSync('src/components/Game.tsx', 'utf8');

// Replace deck logic
code = code.replace(/{latestMove\?\.move_type\.includes\('deck'\) \? 'ring-2/g, "{latestMove?.player_id !== userId && latestMove?.move_type.includes('deck') ? 'ring-2");
code = code.replace(/{latestMove\?\.move_type\.includes\('deck'\) && \(/g, "{latestMove?.player_id !== userId && latestMove?.move_type.includes('deck') && (");

// Replace discard logic
code = code.replace(/{latestMove\?\.move_type\.includes\('discard'\) \? 'ring-2 ring-ui-green ring-offset-1/g, "{latestMove?.player_id !== userId && latestMove?.move_type.includes('discard') ? 'ring-2 ring-ui-green ring-offset-1");
code = code.replace(/{latestMove\?\.move_type\.includes\('discard'\) && \(/g, "{latestMove?.player_id !== userId && latestMove?.move_type.includes('discard') && (");

// Replace "CPU" text with dynamic text
code = code.replace(/<div className="absolute -top-4 left-1\/2 -translate-x-1\/2 bg-ui-orange text-white text-\[5px\] font-bold px-1 py-0\.5 rounded-full whitespace-nowrap animate-bounce z-50">\s*CPU\s*<\/div>/g, '<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-ui-orange text-white text-[5px] font-bold px-1 py-0.5 rounded-full whitespace-nowrap animate-bounce z-50">\n                 {latestMove.player_id === "cpu" ? "CPU" : "OPPONENT"}\n               </div>');
code = code.replace(/<div className="absolute -top-4 left-1\/2 -translate-x-1\/2 bg-ui-green text-bg-dark text-\[5px\] font-bold px-1 py-0\.5 rounded-full whitespace-nowrap animate-bounce z-50">\s*CPU\s*<\/div>/g, '<div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-ui-green text-bg-dark text-[5px] font-bold px-1 py-0.5 rounded-full whitespace-nowrap animate-bounce z-50">\n                 {latestMove.player_id === "cpu" ? "CPU" : "OPPONENT"}\n               </div>');

fs.writeFileSync('src/components/Game.tsx', code);
