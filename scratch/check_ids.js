const fs = require('fs');

function checkIds(htmlPath, jsPath) {
    console.log(`\nChecking IDs between ${htmlPath} and ${jsPath}`);
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    const jsContent = fs.readFileSync(jsPath, 'utf8');
    
    // Find all document.getElementById('...') or "..."
    const getElementIdRegex = /document\.getElementById\(['"]([^'"]+)['"]\)/g;
    let match;
    const jsIds = new Set();
    while ((match = getElementIdRegex.exec(jsContent)) !== null) {
        jsIds.add(match[1]);
    }
    
    // Find all querySelector/querySelectorAll with IDs
    const querySelectorIdRegex = /document\.querySelector(?:All)?\(['"]#([^'"]+)['"]\)/g;
    while ((match = querySelectorIdRegex.exec(jsContent)) !== null) {
        // Strip other selectors if any, but usually it's just ID
        const cleanId = match[1].split(/[\s,>+~:.\[]/)[0];
        if (cleanId) jsIds.add(cleanId);
    }
    
    console.log(`Extracted ${jsIds.size} unique IDs from ${jsPath}:`);
    console.log(Array.from(jsIds).sort());
    
    // Check which ones are missing in HTML
    const missing = [];
    for (const id of jsIds) {
        // A simple check for id="ID" or id='ID'
        const hasId = htmlContent.includes(`id="${id}"`) || htmlContent.includes(`id='${id}'`);
        if (!hasId) {
            missing.push(id);
        }
    }
    
    if (missing.length > 0) {
        console.log(`\n❌ Missing IDs in HTML:`);
        missing.forEach(id => console.log(`  - ${id}`));
    } else {
        console.log(`\n✅ All JS IDs are present in the HTML!`);
    }
}

checkIds('index.html', 'app.js');
checkIds('public/index.html', 'public/app.js');
