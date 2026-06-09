const fs = require('fs');
const path = require('path');

// 1. Read app.js to get countriesList or aliases
const appJsPath = path.join(__dirname, '../app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

// Parse countriesList
const countriesMatch = appJsContent.match(/const countriesList = (\[[\s\S]*?\]);/);
if (!countriesMatch) {
    console.error('Failed to extract countriesList');
    process.exit(1);
}
const countriesList = JSON.parse(countriesMatch[1]);
const countryNames = new Set(countriesList.map(c => c.CName.trim()));

// Add some common country names / aliases
const standardCountries = [
    '阿联酋', '俄罗斯联邦', '波斯尼亚和黑塞哥维那', '叙利亚', '中非共和国',
    '圣马丁(荷属)', '圣马丁（荷属）', '科特迪瓦(象牙海岸)'
];
standardCountries.forEach(c => countryNames.add(c));

// 2. Read transit_times.json
const transitTimesPath = path.join(__dirname, '../transit_times.json');
const transitTimes = JSON.parse(fs.readFileSync(transitTimesPath, 'utf8'));

// 3. Find non-country keys for each channel
console.log('--- Non-country keys found in transit_times.json ---');
for (const [channelCode, data] of Object.entries(transitTimes)) {
    const nonCountryKeys = [];
    for (const key of Object.keys(data)) {
        if (!countryNames.has(key)) {
            // Check if key is a country code or something
            nonCountryKeys.push(key);
        }
    }
    if (nonCountryKeys.length > 0) {
        console.log(`Channel: ${channelCode}`);
        nonCountryKeys.forEach(k => {
            console.log(`  - "${k}": "${data[k]}"`);
        });
    }
}
