const fs = require('fs');

// Load countries.json
const countriesData = JSON.parse(fs.readFileSync('/Users/6hklsfj7h/Desktop/官网webflow/物流查询/countries.json', 'utf8'));
const countriesList = countriesData.Items || [];

// Create a mapping of CName and variations to CountryCode
const countryMapByCName = {};
countriesList.forEach(c => {
    const cleanCName = c.CName.trim().replace(/\s+/g, '');
    countryMapByCName[cleanCName] = c;
});

// Clean and check
function getExcelTransit(excelMap, cname) {
    if (!excelMap || !cname) return null;
    
    const cleanCName = cname.trim().replace(/\s+/g, '');
    if (excelMap[cleanCName]) return excelMap[cleanCName];
    
    // Explicit alias map to prevent substring collision
    const countryAliases = {
        '阿拉伯联合酋长国': ['阿联酋', '阿拉伯联合酋长国'],
        '阿联酋': ['阿拉伯联合酋长国', '阿联酋'],
        '俄罗斯': ['俄罗斯联邦', '俄罗斯'],
        '俄罗斯联邦': ['俄罗斯', '俄罗斯联邦'],
        '留尼汪岛': ['留尼汪', '留尼汪岛'],
        '阿鲁巴岛': ['阿鲁巴', '阿鲁巴岛'],
        '博奈尔、圣尤斯特歇斯和萨巴': ['荷兰加勒比区', '博奈尔、圣尤斯特歇斯和萨巴'],
        '科特迪瓦(象牙海岸)': ['科特迪瓦', '科特迪瓦(象牙海岸)'],
        '圣文森特和格林纳丁斯岛': ['圣文森特和格林纳丁斯', '圣文森特和格林纳丁斯岛'],
        '美属萨摩亚群岛': ['美属萨摩亚', '美属萨摩亚群岛'],
        '安提瓜及巴布达': ['安提瓜和巴布达', '安提瓜及巴布达'],
        '安圭拉岛': ['安圭拉', '安圭拉岛'],
        '波斯尼亚-黑塞哥维那共和国': ['波斯尼亚和黑塞哥维那', '波斯尼亚-黑塞哥维那共和国'],
        '泽西岛(英属)': ['泽西岛', '泽西岛(英属)'],
        '黑山共和国': ['黑山', '黑山共和国'],
        '南苏丹共和国': ['南苏丹', '南苏丹共和国'],
        '刚果': ['刚果共和国', '刚果'],
        '法鲁群岛': ['法罗群岛', '法鲁群岛'],
        '基利巴斯共和国': ['基里巴斯', '基利巴斯共和国'],
        '圣基茨': ['圣基茨和尼维斯', '圣基茨'],
        '塞班岛': ['北马里亚纳群岛', '塞班岛'],
        '瑙鲁共和国': ['瑙鲁', '瑙鲁共和国'],
        '塔希堤': ['法属波利尼西亚', '塔希堤'],
        '西萨摩亚': ['萨摩亚', '西萨摩亚'],
        '波利维亚': ['玻利维亚', '波利维亚'],
        '佛得角群岛': ['佛得角', '佛得角群岛'],
        '荷属圣马丁': ['圣马丁（荷属）', '圣马丁(荷属)', '荷属圣马丁'],
        '瓦利斯群岛和富图纳群岛': ['瓦利斯和富图纳', '瓦利斯群岛和富图纳群岛'],
        '圣皮埃尔和密克隆群岛': ['圣皮埃尔和密克隆', '圣皮埃尔和密克隆群岛']
    };
    
    // Check aliases
    const aliases = countryAliases[cleanCName];
    if (aliases) {
        for (const alias of aliases) {
            if (excelMap[alias]) return excelMap[alias];
        }
    }
    
    // Final fallback: try to find key that exactly matches cleanCName after cleaning whitespaces
    const keys = Object.keys(excelMap);
    for (const key of keys) {
        if (key.trim().replace(/\s+/g, '') === cleanCName) {
            return excelMap[key];
        }
    }
    
    return null;
}

// Load transit_times.json
const transitTimesData = JSON.parse(fs.readFileSync('/Users/6hklsfj7h/Desktop/官网webflow/物流查询/transit_times.json', 'utf8'));

// Keys in transit_times that are NOT country names
const ignoreKeys = new Set([
    '重量（KG）', '0<W≤2', '2<W≤5', '5<W≤10', '10<W≤20', '0<W≤0.5', '0.5<W≤1', '1<W≤2',
    '2<W≤3', '3<W≤4', '4<W≤5', '5不接收异形件。', '5.不接收异形件。', '协议客户：',
    'FROM(回邮地址）：', '客户名字，电话', '邮编：', '退件单位：', '面单要求：',
    '跟踪号要求：', '东莞直封国家（46）', '广州互封国家（106）', '北京互封国家（83）',
    '上海互封（3）', '乌鲁木齐互封（5）', '邮局处理中心操作流程（平邮挂号处理流程一致）',
    '其他说明', '平邮查询网址'
]);

let totalEntries = 0;
let matchedEntries = 0;
const unmatchedDetails = [];

Object.entries(transitTimesData).forEach(([channelCode, countryMap]) => {
    Object.keys(countryMap).forEach(key => {
        // Skip metadata/ignored keys
        if (ignoreKeys.has(key) || key.includes('W≤') || key.includes('W<')) {
            return;
        }
        
        totalEntries++;
        // Find which country from countries.json maps to this channel's key
        let matched = false;
        for (const c of countriesList) {
            const actual = getExcelTransit(countryMap, c.CName);
            if (actual && countryMap[key] === actual) {
                // Check if this country matches the current key (either directly or via alias)
                // Let's verify if the resolved country has an alias/name that matches key
                const resolved = getExcelTransit(countryMap, c.CName);
                if (resolved) {
                    matched = true;
                    break;
                }
            }
        }
        
        // Let's verify by checking if the key itself can be resolved via resolveCountry helper
        const cleanKey = key.trim().replace(/\s+/g, '');
        // Explicit aliases list reversed
        const aliasMapReversed = {
            '留尼汪': '留尼汪岛',
            '阿鲁巴': '阿鲁巴岛',
            '荷兰加勒比区': '博奈尔、圣尤斯特歇斯和萨巴',
            '科特迪瓦': '科特迪瓦(象牙海岸)',
            '圣文森特和格林纳丁斯': '圣文森特和格林纳丁斯岛',
            '美属萨摩亚': '美属萨摩亚群岛',
            '安提瓜和巴布达': '安提瓜及巴布达',
            '安圭拉': '安圭拉岛',
            '波斯尼亚和黑塞哥维那': '波斯尼亚-黑塞哥维那共和国',
            '泽西岛': '泽西岛(英属)',
            '黑山': '黑山共和国',
            '南苏丹': '南苏丹共和国',
            '刚果共和国': '刚果',
            '法罗群岛': '法鲁群岛',
            '基里巴斯': '基利巴斯共和国',
            '圣基茨和尼维斯': '圣基茨',
            '北马里亚纳群岛': '塞班岛',
            '瑙鲁': '瑙鲁共和国',
            '法属波利尼西亚': '塔希堤',
            '萨摩亚': '西萨摩亚',
            '玻利维亚': '波利维亚',
            '佛得角': '佛得角群岛',
            '圣马丁（荷属）': '荷属圣马丁',
            '圣马丁(荷属)': '荷属圣马丁',
            '瓦利斯和富图纳': '瓦利斯群岛和富图纳群岛',
            '圣皮埃尔和密克隆': '圣皮埃尔和密克隆群岛',
            '阿联酋': '阿拉伯联合酋长国',
            '俄罗斯联邦': '俄罗斯',
            '俄罗斯': '俄罗斯'
        };
        const mappedName = aliasMapReversed[cleanKey] || cleanKey;
        if (countryMapByCName[mappedName]) {
            matched = true;
        }

        if (matched) {
            matchedEntries++;
        } else {
            unmatchedDetails.push({ channelCode, key });
        }
    });
});

console.log('--- 时效数据匹配覆盖率检查报告 (使用优化别名) ---');
console.log(`总国家匹配条目数: ${totalEntries}`);
console.log(`成功匹配条目数: ${matchedEntries} (${((matchedEntries/totalEntries)*100).toFixed(2)}%)`);
console.log(`未匹配条目数: ${totalEntries - matchedEntries}`);

if (unmatchedDetails.length > 0) {
    console.log('\n仍未匹配的条目:');
    console.log(unmatchedDetails);
} else {
    console.log('\n恭喜！加入别名映射后，所有时效表中的国家都完美匹配到了 countries.json 中的对应代码，匹配准确率达到 100%！');
}
