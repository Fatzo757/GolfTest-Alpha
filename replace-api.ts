import fs from 'fs';
import path from 'path';

function walkDir(dir: string, callback: (path: string) => void) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(dirPath);
    });
}

walkDir('./src', function(filePath: string) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = content;
        
        // Single quotes
        modified = modified.replace(/fetch\('\/api\/([^']+)'/g, "fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/$1`");
        
        // Double quotes
        modified = modified.replace(/fetch\("\/api\/([^"]+)"/g, "fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/$1`");

        // Backticks
        modified = modified.replace(/fetch\(`\/api\/([^`]+)`/g, "fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/$1`");

        // Exactly fetch('/api') or fetch("/api") or fetch(`/api`)
        modified = modified.replace(/fetch\('\/api'\)/g, "fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api`)");
        modified = modified.replace(/fetch\("\/api"\)/g, "fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api`)");
        modified = modified.replace(/fetch\(`\/api`\)/g, "fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api`)");

        if (modified !== content) {
            fs.writeFileSync(filePath, modified);
            console.log('Updated:', filePath);
        }
    }
});
