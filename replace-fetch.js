const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

walkDir('./src', function(filePath) {
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = content;
        
        // Replace fetch('/api/...
        modified = modified.replace(/fetch\('\/api\//g, "fetch(${import.meta.env.VITE_API_BASE_URL || ''}/api/");
        
        // Replace fetch(/api/...
        modified = modified.replace(/fetch\(\\/api\//g, "fetch(${import.meta.env.VITE_API_BASE_URL || ''}/api/");

        if (modified !== content) {
            fs.writeFileSync(filePath, modified);
            console.log('Updated:', filePath);
        }
    }
});
