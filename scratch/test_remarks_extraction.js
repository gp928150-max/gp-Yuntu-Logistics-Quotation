const fs = require('fs');
const path = require('path');

// Mock countriesList and aliases for testing
const appJsPath = path.join(__dirname, '../app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf8');

const countriesMatch = appJsContent.match(/const countriesList = (\[[\s\S]*?\]);/);
const countriesList = JSON.parse(countriesMatch[1]);

const aliasesMatch = appJsContent.match(/const aliases = (\{[\s\S]*?\});/);
const aliases = eval(`(${aliasesMatch[1]})`);

function extractChannelRemarksAndRates(channelCode, transitTimesData) {
    const excelTransitMap = transitTimesData[channelCode];
    if (!excelTransitMap) return { remarks: [], rates: [] };
    
    const remarks = [];
    const rates = [];
    
    const allKnownCountries = new Set();
    countriesList.forEach(c => {
        if (c.CName) allKnownCountries.add(c.CName.trim());
        if (c.EName) allKnownCountries.add(c.EName.trim().toLowerCase());
        if (c.CountryCode) allKnownCountries.add(c.CountryCode.trim().toLowerCase());
    });
    for (const code in aliases) {
        aliases[code].forEach(alias => allKnownCountries.add(alias.trim()));
    }
    const extraCountries = [
        '阿联酋', '俄罗斯联邦', '波斯尼亚和黑塞哥维那', '叙利亚', '中非共和国',
        '圣马丁(荷属)', '圣马丁（荷属）', '科特迪瓦(象牙海岸)', '留尼汪',
        '阿鲁巴', '荷兰加勒比区', '科特迪瓦', '圣文森特和格林纳丁斯', '美属萨摩亚',
        '安提瓜和巴布达', '安圭拉', '泽西岛', '黑山', '南苏丹', '刚果共和国',
        '刚果民主共和国', '法罗群岛', '基里巴斯', '圣基茨和尼维斯', '北马里亚纳群岛',
        '瑙鲁', '法属波利尼西亚', '萨摩亚', '玻利维亚', '佛得角', '瓦利斯和富图纳',
        '圣皮埃尔和密克隆', '委内瑞拉', '马绍尔群岛', '开曼群岛', '库克群岛',
        '新喀里多尼亚', '英属维尔京群岛', '约旦', '越南', '巴勒斯坦', '巴拉圭',
        '圣马力诺', '利比亚', '托克劳', '瓦努阿图', '瓜德罗普', '美属维尔京群岛',
        '东帝汶', '哈萨克斯坦', '吉尔吉斯斯坦', '塔吉克斯坦', '土库曼斯坦',
        '马约特', '毛里求斯', '尼加拉瓜', '塞舌尔', '斯威士兰', '图瓦卢',
        '危地马拉', '直布罗陀', '澳门', '香港', '台湾'
    ];
    extraCountries.forEach(c => allKnownCountries.add(c));

    for (const [key, val] of Object.entries(excelTransitMap)) {
        const trimmedKey = key.trim();
        const trimmedVal = val ? val.trim() : '';
        
        if (allKnownCountries.has(trimmedKey) || allKnownCountries.has(trimmedKey.toLowerCase())) {
            continue;
        }
        
        if (/^\d+-\d+\s*(工作日|天|days|work\s*days)/i.test(trimmedVal) || 
            /^\d+\s*(工作日|天|days|work\s*days)/i.test(trimmedVal) ||
            /受.*政策影响/i.test(trimmedVal) ||
            /预计延误/i.test(trimmedVal)) {
            continue;
        }
        
        if (trimmedKey === '重量（KG）' || trimmedKey === '运费' || 
            /W[≤<≥>]/i.test(trimmedKey) || /W\s*[\d\.]+/i.test(trimmedKey) ||
            trimmedVal.startsWith('CNY') || trimmedVal.startsWith('USD')) {
            rates.push({ key: trimmedKey, val: trimmedVal });
        } else {
            remarks.push({ key: trimmedKey, val: trimmedVal });
        }
    }
    
    return { remarks, rates };
}

// Read transit_times.json
const transitTimes = JSON.parse(fs.readFileSync(path.join(__dirname, '../transit_times.json'), 'utf8'));

// Test channels
const testChannels = ['CNDWA', 'SCZXR', 'BKZXR', 'THZXR'];
for (const code of testChannels) {
    console.log(`\n================ ${code} ================`);
    const { remarks, rates } = extractChannelRemarksAndRates(code, transitTimes);
    console.log(`Remarks (${remarks.length}):`);
    remarks.forEach(r => console.log(`  - ${r.key}: ${r.val}`));
    console.log(`Rates (${rates.length}):`);
    rates.forEach(r => console.log(`  - ${r.key}: ${r.val}`));
}
