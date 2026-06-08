document.addEventListener('DOMContentLoaded', () => {
    // Input Fields
    const quoteForm = document.getElementById('quote-form');
    const quoteCountry = document.getElementById('quote-country');
    const quoteWeight = document.getElementById('quote-weight');
    const quoteGoodsType = document.getElementById('quote-goods-type');
    const quotePostcode = document.getElementById('quote-postcode');
    const quoteLength = document.getElementById('quote-length');
    const quoteWidth = document.getElementById('quote-width');
    const quoteHeight = document.getElementById('quote-height');
    
    // Custom Select elements
    const countrySelectContainer = document.getElementById('country-select-container');
    const countrySelectTrigger = document.getElementById('country-select-trigger');
    const countryTriggerLabel = document.getElementById('country-trigger-label');
    const countrySelectDropdown = document.getElementById('country-select-dropdown');
    const countrySearchInput = document.getElementById('country-search-input');
    const countryOptionsList = document.getElementById('country-options-list');

    // Custom Currency Select elements
    const currencySelectContainer = document.getElementById('currency-select-container');
    const currencySelectTrigger = document.getElementById('currency-select-trigger');
    const currencyTriggerLabel = document.getElementById('currency-trigger-label');
    const currencySelectDropdown = document.getElementById('currency-select-dropdown');
    const currencyOptionsList = document.getElementById('currency-options-list');
    const quoteCurrencyInput = document.getElementById('quote-currency');

    // States
    const welcomeState = document.getElementById('welcome-state');
    const loadingState = document.getElementById('loading-state');
    const errorState = document.getElementById('error-state');
    const quoteResultsState = document.getElementById('quote-results-state');

    // Metrics elements
    const metricsSection = document.getElementById('metrics-section');
    const metricCheapestVal = document.getElementById('metric-cheapest-val');
    const metricCheapestName = document.getElementById('metric-cheapest-name');
    const metricFastestVal = document.getElementById('metric-fastest-val');
    const metricFastestName = document.getElementById('metric-fastest-name');
    const metricTotalVal = document.getElementById('metric-total-val');
    
    // Results List elements
    const quoteSummaryDetails = document.getElementById('quote-summary-details');
    const quoteChannelsContainer = document.getElementById('quote-channels-container');
    const quoteSortBtn = document.getElementById('quote-sort-btn');

    let quoteData = [];
    let rawQuoteItems = []; // Raw items cache for dynamic recalculation
    let isQuoteSortAscending = true; // Lowest price first by default
    let selectedCountryCode = '';
    let transitTimesData = {}; // Transit times data from Excel

    const EXCHANGE_RATES = {
        CNY: 1.0,
        USD: 7.25,
        EUR: 7.85,
        HKD: 0.93
    };

    function getSelectedCurrency() {
        const select = document.getElementById('quote-currency');
        return select ? select.value : 'CNY';
    }

    function getDisplayPrice(amountInCNY) {
        if (amountInCNY === null || amountInCNY === undefined) return 0;
        const target = getSelectedCurrency();
        const rate = EXCHANGE_RATES[target] || 1.0;
        return amountInCNY / rate;
    }

    function getCurrencySymbol() {
        const target = getSelectedCurrency();
        const symbols = {
            CNY: '¥',
            USD: '$',
            EUR: '€',
            HKD: 'HK$'
        };
        return symbols[target] || '¥';
    }

    function updateRatesUI() {
        try {
            // Update top status bar tickers (4 decimal places)
            const tickerUsd = document.getElementById('rate-ticker-usd');
            const tickerEur = document.getElementById('rate-ticker-eur');
            const tickerHkd = document.getElementById('rate-ticker-hkd');
            if (tickerUsd) tickerUsd.textContent = EXCHANGE_RATES.USD.toFixed(4);
            if (tickerEur) tickerEur.textContent = EXCHANGE_RATES.EUR.toFixed(4);
            if (tickerHkd) tickerHkd.textContent = EXCHANGE_RATES.HKD.toFixed(4);

            // Update custom dropdown labels (4 decimal places)
            const dropUsd = document.getElementById('rate-dropdown-usd');
            const dropEur = document.getElementById('rate-dropdown-eur');
            const dropHkd = document.getElementById('rate-dropdown-hkd');
            if (dropUsd) dropUsd.textContent = `1 USD ≈ ${EXCHANGE_RATES.USD.toFixed(4)} CNY`;
            if (dropEur) dropEur.textContent = `1 EUR ≈ ${EXCHANGE_RATES.EUR.toFixed(4)} CNY`;
            if (dropHkd) dropHkd.textContent = `1 HKD ≈ ${EXCHANGE_RATES.HKD.toFixed(4)} CNY`;
        } catch (err) {
            console.error('Error updating rates UI:', err);
        }
    }

    async function fetchRealTimeExchangeRates() {
        try {
            const response = await fetch('https://open.er-api.com/v6/latest/CNY');
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            if (data && data.rates) {
                // The rates are relative to 1 CNY. E.g. 1 CNY = 0.138 USD.
                // So 1 USD = 1 / 0.138 CNY.
                const usdToCny = 1 / parseFloat(data.rates.USD);
                const eurToCny = 1 / parseFloat(data.rates.EUR);
                const hkdToCny = 1 / parseFloat(data.rates.HKD);
                
                if (usdToCny && eurToCny && hkdToCny) {
                    EXCHANGE_RATES.USD = usdToCny;
                    EXCHANGE_RATES.EUR = eurToCny;
                    EXCHANGE_RATES.HKD = hkdToCny;
                    
                    updateRatesUI();
                    console.log('Successfully updated real-time exchange rates:', EXCHANGE_RATES);
                }
            }
        } catch (error) {
            console.warn('Failed to load real-time exchange rates, utilizing static fallback values:', error);
        }
    }

    async function loadTransitTimes() {
        try {
            const response = await fetch('transit_times.json');
            if (!response.ok) throw new Error('Failed to load transit times');
            transitTimesData = await response.json();
            console.log('Successfully loaded transit times:', Object.keys(transitTimesData).length, 'channels.');
        } catch (error) {
            console.warn('Failed to load transit times from transit_times.json:', error);
        }
    }

    async function loadConfig() {
        try {
            const response = await fetch('config.json');
            if (response.ok) {
                const data = await response.json();
                SYSTEM_PROFIT_MARGIN = parseFloat(data.profit_margin) || 1.22;
                SYSTEM_PACKAGING_FEE = parseFloat(data.packaging_fee) !== undefined ? parseFloat(data.packaging_fee) : 2.0;
                console.log('Successfully loaded config from server:', SYSTEM_PROFIT_MARGIN, SYSTEM_PACKAGING_FEE);
                
                // Prefill admin panel form inputs
                if (adminProfitInput) {
                    adminProfitInput.value = Math.round((SYSTEM_PROFIT_MARGIN - 1) * 100);
                }
                if (adminPackInput) {
                    adminPackInput.value = SYSTEM_PACKAGING_FEE;
                }

                // If there are raw items, recalculate and render!
                if (rawQuoteItems && rawQuoteItems.length > 0) {
                    calculateAndRenderQuoteData();
                }
            }
        } catch (e) {
            console.warn('Failed to load config.json from server:', e);
        }
    }

    // Secure token credentials (embedded client-side for GitHub Pages deployment)
    const CLIENT_CODE = 'CN3949603';
    const API_SECRET = '3ihcklF2g/g1NdP1ZhzhXw==';
    const tokenSource = `${CLIENT_CODE}&${API_SECRET}`;
    const authToken = btoa(tokenSource); // Base64 in browser JS

    // Convert 2-letter country code to Unicode Flag Emoji
    function getFlagEmoji(countryCode) {
        if (!countryCode || countryCode.length !== 2) return '🌐';
        const codePoints = countryCode
            .toUpperCase()
            .split('')
            .map(char => 127397 + char.charCodeAt(0));
        try {
            return String.fromCodePoint(...codePoints);
        } catch (e) {
            return '🌐';
        }
    }

    // Country Code Mapping (populated dynamically)
    let countryNames = {};

    // Static country list to bypass API mixed content and speed up loading
    const countriesList = [{"CountryCode":"AD","EName":"ANDORRA","CName":"安道尔"},{"CountryCode":"AE","EName":"UNITED ARAB EMIRATES","CName":"阿拉伯联合酋长国"},{"CountryCode":"AF","EName":"AFGHANISTAN","CName":"阿富汗"},{"CountryCode":"AG","EName":"ANTIGUA AND BARBUDA","CName":"安提瓜及巴布达"},{"CountryCode":"AI","EName":"ANGUILLA","CName":"安圭拉岛"},{"CountryCode":"AL","EName":"ALBANIA","CName":"阿尔巴尼亚"},{"CountryCode":"AM","EName":"ARMENIA","CName":"亚美尼亚"},{"CountryCode":"AN","EName":"NETHERLANDS ANTILLES","CName":"荷属安的列斯群岛"},{"CountryCode":"AO","EName":"ANGOLA","CName":"安哥拉"},{"CountryCode":"AQ","EName":"ANTARCTICA","CName":"南极洲"},{"CountryCode":"AR","EName":"ARGENTINA","CName":"阿根廷"},{"CountryCode":"AS","EName":"AMERICAN SAMOA","CName":"美属萨摩亚群岛"},{"CountryCode":"AT","EName":"AUSTRIA","CName":"奥地利"},{"CountryCode":"AU","EName":"AUSTRALIA","CName":"澳大利亚"},{"CountryCode":"AW","EName":"ARUBA","CName":"阿鲁巴岛"},{"CountryCode":"AX","EName":"Åland Islands","CName":"奥兰群岛"},{"CountryCode":"AZ","EName":"AZERBAIJAN","CName":"阿塞拜疆"},{"CountryCode":"BA","EName":"BOSNIA AND HERZEGOVINA","CName":"波斯尼亚-黑塞哥维那共和国"},{"CountryCode":"BB","EName":"BARBADOS","CName":"巴巴多斯"},{"CountryCode":"BD","EName":"BANGLADESH","CName":"孟加拉国"},{"CountryCode":"BE","EName":"BELGIUM","CName":"比利时"},{"CountryCode":"BF","EName":"BURKINA FASO","CName":"布基纳法索"},{"CountryCode":"BG","EName":"BULGARIA","CName":"保加利亚"},{"CountryCode":"BH","EName":"BAHRAIN","CName":"巴林"},{"CountryCode":"BI","EName":"BURUNDI","CName":"布隆迪"},{"CountryCode":"BJ","EName":"BENIN","CName":"贝宁"},{"CountryCode":"BM","EName":"BERMUDA","CName":"百慕大"},{"CountryCode":"BN","EName":"BRUNEI","CName":"文莱"},{"CountryCode":"BO","EName":"BOLIVIA","CName":"波利维亚"},{"CountryCode":"BQ","EName":"Bonaire","CName":"博奈尔、圣尤斯特歇斯和萨巴"},{"CountryCode":"BR","EName":"BRAZIL","CName":"巴西"},{"CountryCode":"BS","EName":"BAHAMAS","CName":"巴哈马"},{"CountryCode":"BT","EName":"BHUTAN","CName":"不丹"},{"CountryCode":"BV","EName":"BOUVET ISLAND","CName":"布维岛"},{"CountryCode":"BW","EName":"BOTSWANA","CName":"博茨瓦纳"},{"CountryCode":"BY","EName":"BELARUS","CName":"白俄罗斯"},{"CountryCode":"BZ","EName":"BELIZE","CName":"伯利兹"},{"CountryCode":"CA","EName":"Canada","CName":"加拿大"},{"CountryCode":"CC","EName":"COCOS(KEELING)ISLANDS","CName":"科科斯群岛"},{"CountryCode":"CD","EName":"CONGO REPUBLIC ","CName":"刚果民主共和国"},{"CountryCode":"CF","EName":"CENTRAL REPUBLIC","CName":"中非共和国"},{"CountryCode":"CG","EName":"CONGO","CName":"刚果"},{"CountryCode":"CH","EName":"SWITZERLAND","CName":"瑞士"},{"CountryCode":"CI","EName":"COTE D'LVOIRE(IVORY)","CName":"科特迪瓦(象牙海岸) "},{"CountryCode":"CK","EName":"COOK ISLANDS","CName":"库克群岛"},{"CountryCode":"CL","EName":"CHILE","CName":"智利"},{"CountryCode":"CM","EName":"CAMEROON","CName":"喀麦隆"},{"CountryCode":"CN","EName":"CHINA","CName":"中国"},{"CountryCode":"CO","EName":"COLOMBIA","CName":"哥伦比亚"},{"CountryCode":"CR","EName":"COSTA RICA","CName":"哥斯达黎加"},{"CountryCode":"CU","EName":"CUBA","CName":"古巴"},{"CountryCode":"CV","EName":"CAPE VERDE","CName":"佛得角群岛"},{"CountryCode":"CW","EName":"Curacao","CName":"库拉索岛"},{"CountryCode":"CX","EName":"CHRISTMAS ISLAND","CName":"圣诞岛"},{"CountryCode":"CY","EName":"CYPRUS","CName":"塞浦路斯"},{"CountryCode":"CZ","EName":"CZECH REPUBLIC","CName":"捷克"},{"CountryCode":"DE","EName":"GERMANY","CName":"德国"},{"CountryCode":"DJ","EName":"DJIBOUTI","CName":"吉布提"},{"CountryCode":"DK","EName":"DENMARK","CName":"丹麦"},{"CountryCode":"DM","EName":"DOMINICA","CName":"多米尼克"},{"CountryCode":"DO","EName":"DOMINICAN REPUBLIC","CName":"多米尼加共和国"},{"CountryCode":"DZ","EName":"ALGERIA","CName":"阿尔及利亚"},{"CountryCode":"EC","EName":"ECUADOR","CName":"厄瓜多尔"},{"CountryCode":"EE","EName":"ESTONIA","CName":"爱沙尼亚"},{"CountryCode":"EG","EName":"EGYPT","CName":"埃及"},{"CountryCode":"EH","EName":"WESTERN SAHARA ","CName":"西撒哈拉"},{"CountryCode":"ER","EName":"ERITREA","CName":"厄立特里亚"},{"CountryCode":"ES","EName":"SPAIN","CName":"西班牙"},{"CountryCode":"ET","EName":"ETHIOPIA","CName":"埃塞俄比亚"},{"CountryCode":"FI","EName":"FINLAND","CName":"芬兰"},{"CountryCode":"FJ","EName":"FIJI","CName":"斐济"},{"CountryCode":"FK","EName":"FALKLAND ISLAND","CName":"福克兰群岛"},{"CountryCode":"FM","EName":"MICRONESIA","CName":"密克罗尼西亚"},{"CountryCode":"FO","EName":"FAROE ISLANDS","CName":"法鲁群岛"},{"CountryCode":"FR","EName":"FRANCE","CName":"法国"},{"CountryCode":"FX","EName":"FRANCE, METROPOLITAN","CName":"法属美特罗波利坦"},{"CountryCode":"GA","EName":"GABON","CName":"加蓬"},{"CountryCode":"GD","EName":"GRENADA","CName":"格林纳达"},{"CountryCode":"GE","EName":"GEORGIA","CName":"格鲁吉亚"},{"CountryCode":"GF","EName":"FRENCH GUIANA","CName":"法属圭亚那"},{"CountryCode":"GG","EName":"GUERNSEY","CName":"根西岛"},{"CountryCode":"GH","EName":"GHANA","CName":"加纳"},{"CountryCode":"GI","EName":"GIBRALTAR","CName":"直布罗陀"},{"CountryCode":"GL","EName":"GREENLAND","CName":"格陵兰"},{"CountryCode":"GM","EName":"GAMBIA","CName":"冈比亚"},{"CountryCode":"GN","EName":"GUINEA ","CName":"几内亚"},{"CountryCode":"GP","EName":"GUADELOUPE","CName":"瓜德罗普"},{"CountryCode":"GQ","EName":"EQUATORIAL GUINEA ","CName":"赤道几内亚"},{"CountryCode":"GR","EName":"GREECE","CName":"希腊"},{"CountryCode":"GS","EName":"SOUTH GEORGIA AND THE SOUTH SANDWICH ISL","CName":"南乔治亚岛和南桑威奇群岛"},{"CountryCode":"GT","EName":"GUATEMALA","CName":"危地马拉"},{"CountryCode":"GU","EName":"GUAM","CName":"关岛"},{"CountryCode":"GW","EName":"GUINEA BISSAU","CName":"几内亚比绍"},{"CountryCode":"GY","EName":"GUYANA (BRITISH)","CName":"圭亚那"},{"CountryCode":"HK","EName":"HONG KONG, CHINA","CName":"中国香港"},{"CountryCode":"HM","EName":"HEARD ISLAND AND MCDONALD ISLANDS","CName":"赫德岛和麦克唐纳岛"},{"CountryCode":"HN","EName":"HONDURAS","CName":"洪都拉斯"},{"CountryCode":"HR","EName":"CROATIA","CName":"克罗地亚"},{"CountryCode":"HT","EName":"HAITI","CName":"海地"},{"CountryCode":"HU","EName":"HUNGARY","CName":"匈牙利"},{"CountryCode":"IC","EName":"CANARY ISLANDS","CName":"加那利群岛"},{"CountryCode":"ID","EName":"INDONESIA","CName":"印度尼西亚"},{"CountryCode":"IE","EName":"IRELAND","CName":"爱尔兰"},{"CountryCode":"IL","EName":"ISRAEL","CName":"以色列"},{"CountryCode":"IM","EName":"Isle of Man","CName":"马恩岛"},{"CountryCode":"IN","EName":"INDIA","CName":"印度"},{"CountryCode":"IO","EName":"BRITISH INDIAN OCEAN TERRITORY","CName":"英属印度洋地区(查各群岛)"},{"CountryCode":"IQ","EName":"IRAQ","CName":"伊拉克"},{"CountryCode":"IR","EName":"IRAN (ISLAMIC REPUBLIC OF)","CName":"伊朗"},{"CountryCode":"IS","EName":"ICELAND","CName":"冰岛"},{"CountryCode":"IT","EName":"ITALY","CName":"意大利"},{"CountryCode":"JE","EName":"JERSEY","CName":"泽西岛(英属)"},{"CountryCode":"JM","EName":"JAMAICA","CName":"牙买加"},{"CountryCode":"JO","EName":"JORDAN","CName":"约旦"},{"CountryCode":"JP","EName":"JAPAN","CName":"日本"},{"CountryCode":"JU","EName":"YUGOSLAVIA","CName":"南斯拉夫"},{"CountryCode":"KE","EName":"KENYA","CName":"肯尼亚"},{"CountryCode":"KG","EName":"KYRGYZSTAN","CName":"吉尔吉斯斯坦"},{"CountryCode":"KH","EName":"CAMBODIA","CName":"柬埔寨"},{"CountryCode":"KI","EName":"KIRIBATI REPUBILC","CName":"基利巴斯共和国"},{"CountryCode":"KM","EName":"COMOROS","CName":"科摩罗"},{"CountryCode":"KN","EName":"SAINT KITTS ","CName":"圣基茨"},{"CountryCode":"KP","EName":"NORTH KOREA\n","CName":"朝鲜"},{"CountryCode":"KR","EName":"SOUTH KOREA","CName":"韩国"},{"CountryCode":"KW","EName":"KUWAIT","CName":"科威特"},{"CountryCode":"KY","EName":"CAYMAN ISLANDS","CName":"开曼群岛"},{"CountryCode":"KZ","EName":"KAZAKHSTAN","CName":"哈萨克斯坦"},{"CountryCode":"LA","EName":"LAOS","CName":"老挝"},{"CountryCode":"LB","EName":"LEBANON","CName":"黎巴嫩"},{"CountryCode":"LC","EName":"ST. LUCIA","CName":"圣卢西亚"},{"CountryCode":"LI","EName":"LIECHTENSTEIN","CName":"列支敦士登"},{"CountryCode":"LK","EName":"SRI LANKA","CName":"斯里兰卡"},{"CountryCode":"LR","EName":"LIBERIA","CName":"利比里亚"},{"CountryCode":"LS","EName":"LESOTHO","CName":"莱索托"},{"CountryCode":"LT","EName":"LITHUANIA","CName":"立陶宛"},{"CountryCode":"LU","EName":"LUXEMBOURG","CName":"卢森堡"},{"CountryCode":"LV","EName":"LATVIA","CName":"拉脱维亚"},{"CountryCode":"LY","EName":"LIBYA","CName":"利比亚"},{"CountryCode":"MA","EName":"MOROCCO","CName":"摩洛哥"},{"CountryCode":"MC","EName":"MONACO","CName":"摩纳哥"},{"CountryCode":"MD","EName":"MOLDOVA","CName":"摩尔多瓦"},{"CountryCode":"ME","EName":"MONTENEGRO","CName":"黑山共和国"},{"CountryCode":"MG","EName":"MADAGASCAR","CName":"马达加斯加"},{"CountryCode":"MH","EName":"MARSHALL ISLANDS","CName":"马绍尔群岛"},{"CountryCode":"MK","EName":"MACEDONIA","CName":"马其顿"},{"CountryCode":"ML","EName":"MALI","CName":"马里"},{"CountryCode":"MM","EName":"MYANMAR","CName":"缅甸"},{"CountryCode":"MN","EName":"MONGOLIA","CName":"蒙古"},{"CountryCode":"MO","EName":"MACAU, CHINA","CName":"中国澳门"},{"CountryCode":"MP","EName":"SAIPAN","CName":"塞班岛"},{"CountryCode":"MQ","EName":"MARTINIQUE","CName":"马提尼克"},{"CountryCode":"MR","EName":"MAURITANIA","CName":"毛里塔尼亚"},{"CountryCode":"MS","EName":"MONTSERRAT","CName":"蒙特塞拉特岛"},{"CountryCode":"MT","EName":"MALTA","CName":"马耳他"},{"CountryCode":"MU","EName":"MAURITIUS","CName":"毛里求斯"},{"CountryCode":"MV","EName":"MALDIVES","CName":"马尔代夫"},{"CountryCode":"MW","EName":"MALAWI","CName":"马拉维"},{"CountryCode":"MX","EName":"MEXICO","CName":"墨西哥"},{"CountryCode":"MY","EName":"MALAYSIA","CName":"马来西亚"},{"CountryCode":"MZ","EName":"MOZAMBIQUE","CName":"莫桑比克"},{"CountryCode":"NA","EName":"NAMIBIA","CName":"纳米比亚"},{"CountryCode":"NC","EName":"NEW CALEDONIA","CName":"新喀里多尼亚"},{"CountryCode":"NE","EName":"NIGER","CName":"尼日尔"},{"CountryCode":"NF","EName":"NORFOLK ISLAND","CName":"诺褔克岛"},{"CountryCode":"NG","EName":"NIGERIA","CName":"尼日利亚"},{"CountryCode":"NI","EName":"NICARAGUA","CName":"尼加拉瓜"},{"CountryCode":"NL","EName":"NETHERLANDS","CName":"荷兰"},{"CountryCode":"NO","EName":"NORWAY","CName":"挪威"},{"CountryCode":"NP","EName":"NEPAL","CName":"尼泊尔"},{"CountryCode":"NR","EName":"NAURU REPUBLIC ","CName":"瑙鲁共和国"},{"CountryCode":"NU","EName":"NIUE","CName":"纽埃岛"},{"CountryCode":"NZ","EName":"NEW ZEALAND","CName":"新西兰"},{"CountryCode":"OM","EName":"OMAN","CName":"阿曼"},{"CountryCode":"PA","EName":"PANAMA","CName":"巴拿马"},{"CountryCode":"PE","EName":"PERU","CName":"秘鲁"},{"CountryCode":"PF","EName":"FRENCH POLYNESIA","CName":"塔希堤"},{"CountryCode":"PG","EName":"PAPUA NEW GUINEA","CName":"巴布亚新几内亚"},{"CountryCode":"PH","EName":"PHILIPPINES","CName":"菲律宾"},{"CountryCode":"PK","EName":"PAKISTAN","CName":"巴基斯坦"},{"CountryCode":"PL","EName":"POLAND","CName":"波兰"},{"CountryCode":"PM","EName":"SAINT PIERRE AND MIQUELON","CName":"圣皮埃尔和密克隆群岛"},{"CountryCode":"PN","EName":"PITCAIRN ISLANDS","CName":"皮特凯恩群岛"},{"CountryCode":"PR","EName":"PUERTO RICO","CName":"波多黎各"},{"CountryCode":"PS","EName":"Palestine State of","CName":"巴勒斯坦"},{"CountryCode":"PT","EName":"PORTUGAL","CName":"葡萄牙"},{"CountryCode":"PW","EName":"PALAU","CName":"帕劳"},{"CountryCode":"PY","EName":"PARAGUAY","CName":"巴拉圭"},{"CountryCode":"QA","EName":"QATAR","CName":"卡塔尔"},{"CountryCode":"RE","EName":"REUNION ISLAND ","CName":"留尼汪岛"},{"CountryCode":"RO","EName":"ROMANIA","CName":"罗马尼亚"},{"CountryCode":"RS","EName":"SERBIA, REPUBLIC OF","CName":"塞尔维亚"},{"CountryCode":"RU","EName":"RUSSIA","CName":"俄罗斯"},{"CountryCode":"RW","EName":"RWANDA","CName":"卢旺达"},{"CountryCode":"SA","EName":"SAUDI ARABIA","CName":"沙特阿拉伯"},{"CountryCode":"SB","EName":"SOLOMON ISLANDS","CName":"所罗门群岛"},{"CountryCode":"SC","EName":"SEYCHELLES","CName":"塞舌尔"},{"CountryCode":"SD","EName":"SUDAN","CName":"苏丹"},{"CountryCode":"SE","EName":"SWEDEN","CName":"瑞典"},{"CountryCode":"SG","EName":"SINGAPORE","CName":"新加坡"},{"CountryCode":"SH","EName":"ST HELENA","CName":"圣赫勒拿岛"},{"CountryCode":"SI","EName":"SLOVENIA","CName":"斯洛文尼亚"},{"CountryCode":"SJ","EName":"SVALBARD AND JAN MAYEN","CName":"斯瓦尔巴岛和扬马延岛"},{"CountryCode":"SK","EName":"SLOVAKIA REPUBLIC","CName":"斯洛伐克"},{"CountryCode":"SL","EName":"SIERRA LEONE","CName":"塞拉利昂"},{"CountryCode":"SM","EName":"SAN MARINO","CName":"圣马力诺"},{"CountryCode":"SN","EName":"SENEGAL","CName":"塞内加尔"},{"CountryCode":"SO","EName":"SOMALIA","CName":"索马里"},{"CountryCode":"SR","EName":"SURINAME","CName":"苏里南"},{"CountryCode":"SS","EName":"SOUTH SUDAN","CName":"南苏丹共和国"},{"CountryCode":"ST","EName":"SAO TOME AND PRINCIPE","CName":"圣多美和普林西比"},{"CountryCode":"SV","EName":"EL SALVADOR","CName":"萨尔瓦多"},{"CountryCode":"SX","EName":"St. Maarten","CName":"荷属圣马丁"},{"CountryCode":"SY","EName":"SYRIA","CName":"叙利亚"},{"CountryCode":"SZ","EName":"SWAZILAND","CName":"斯威士兰"},{"CountryCode":"TA","EName":"TRISTAN DA CUNHA","CName":"特里斯坦"},{"CountryCode":"TC","EName":"TURKS AND CAICOS ISLANDS","CName":"特克斯和凯科斯群岛"},{"CountryCode":"TD","EName":"CHAD","CName":"乍得"},{"CountryCode":"TF","EName":"FRENCH SOUTHERN TERRITORIES","CName":"法属南部领土"},{"CountryCode":"TG","EName":"TOGO","CName":"多哥"},{"CountryCode":"TH","EName":"THAILAND","CName":"泰国"},{"CountryCode":"TJ","EName":"TAJIKISTAN","CName":"塔吉克斯坦"},{"CountryCode":"TK","EName":"TOKELAU","CName":"托克劳"},{"CountryCode":"TL","EName":"EAST TIMOR","CName":"东帝汶"},{"CountryCode":"TM","EName":"TURKMENISTAN","CName":"土库曼斯坦"},{"CountryCode":"TN","EName":"TUNISIA","CName":"突尼斯"},{"CountryCode":"TO","EName":"TONGA","CName":"汤加"},{"CountryCode":"TR","EName":"TURKEY","CName":"土耳其"},{"CountryCode":"TT","EName":"TRINIDAD AND TOBAGO","CName":"特立尼达和多巴哥"},{"CountryCode":"TV","EName":"TUVALU","CName":"图瓦卢"},{"CountryCode":"TW","EName":"TAIWAN, CHINA","CName":"中国台湾"},{"CountryCode":"TZ","EName":"TANZANIA","CName":"坦桑尼亚"},{"CountryCode":"UA","EName":"UKRAINE","CName":"乌克兰"},{"CountryCode":"UG","EName":"UGANDA","CName":"乌干达"},{"CountryCode":"UM","EName":"UNITED STATES MINOR OUTLYING ISLANDS","CName":"美国本土外小岛屿"},{"CountryCode":"US","EName":"UNITED STATES OF AMERICA","CName":"美国"},{"CountryCode":"UY","EName":"URUGUAY","CName":"乌拉圭"},{"CountryCode":"UZ","EName":"UZBEKISTAN","CName":"乌兹别克斯坦"},{"CountryCode":"VA","EName":"VATICAN CITY","CName":"梵蒂冈"},{"CountryCode":"VC","EName":"SAINT VINCENT AND THE GRENADINES","CName":"圣文森特和格林纳丁斯岛"},{"CountryCode":"VE","EName":"VENEZUELA","CName":"委内瑞拉"},{"CountryCode":"VG","EName":"VIRGIN ISLAND (GB)","CName":"英属维尔京群岛"},{"CountryCode":"VI","EName":"VIRGIN ISLAND (US)","CName":"美属维尔京群岛"},{"CountryCode":"VN","EName":"VIETNAM","CName":"越南"},{"CountryCode":"VU","EName":"VANUATU","CName":"瓦努阿图"},{"CountryCode":"VV","EName":"llx","CName":"不列颠帝国"},{"CountryCode":"WF","EName":"WALLIS AND FUTUNA ISLANDS","CName":"瓦利斯群岛和富图纳群岛"},{"CountryCode":"WS","EName":"WESTERN SAMOA","CName":"西萨摩亚"},{"CountryCode":"XB","EName":"BONAIRE","CName":"伯奈尔岛"},{"CountryCode":"XC","EName":"CURACAO","CName":"库拉索岛(荷兰)"},{"CountryCode":"XD","EName":"ASCENSION","CName":"阿森松"},{"CountryCode":"XE","EName":"ST. EUSTATIUS","CName":"圣尤斯塔提马斯岛"},{"CountryCode":"XG","EName":"SPANISH TERRITORIES OF N.AFRICA","CName":"北非西班牙属土"},{"CountryCode":"XH","EName":"AZORES","CName":"亚速尔群岛"},{"CountryCode":"XI","EName":"MADEIRA","CName":"马德拉岛"},{"CountryCode":"XJ","EName":"BALEARIC ISLANDS","CName":"巴利阿里群岛"},{"CountryCode":"XM","EName":"ST. MAARTEN","CName":"圣马腾岛"},{"CountryCode":"XN","EName":"NEVIS","CName":"尼维斯岛"},{"CountryCode":"XS","EName":"SOMALILAND","CName":"索马里兰"},{"CountryCode":"XY","EName":"ST. BARTHELEMY","CName":"圣巴特勒米岛"},{"CountryCode":"YE","EName":"YEMEN, REPUBLIC OF","CName":"也门阿拉伯共合国"},{"CountryCode":"YT","EName":"MAYOTTE","CName":"马约特"},{"CountryCode":"ZA","EName":"SOUTH AFRICA","CName":"南非"},{"CountryCode":"ZM","EName":"ZAMBIA","CName":"赞比亚"},{"CountryCode":"ZR","EName":"ZAIRE","CName":"扎伊尔"},{"CountryCode":"ZW","EName":"ZIMBABWE","CName":"津巴布韦"},{"CountryCode":"GB","EName":"UNITED KINGDOM","CName":"英国"},{"CountryCode":"KV","EName":"KOSOVO","CName":"科索沃"},{"CountryCode":"XK","EName":"CAROLINE ISLANDS","CName":"加罗林群岛"}];

    // European Developed country codes to prioritize at the absolute top
    const europeanDevelopedCodes = new Set([
        'GB', 'DE', 'FR', 'IT', 'ES', 'NL', 'BE', 'PL', 'PT', 'CH', 'SE', 'NO', 'DK', 'FI', 'AT', 'IE', 'LU'
    ]);

    // Other European country codes to place next
    const otherEuropeanCodes = new Set([
        'AD', 'AL', 'BA', 'BG', 'BY', 'CY', 'CZ', 'EE', 'GR', 'HR', 'HU', 
        'IS', 'LI', 'LT', 'LV', 'MC', 'MD', 'ME', 'MK', 'MT', 'RO', 'RS', 
        'RU', 'SI', 'SK', 'SM', 'UA', 'VA'
    ]);

    const getCountryTier = (code) => {
        if (europeanDevelopedCodes.has(code)) return 1;
        if (otherEuropeanCodes.has(code)) return 2;
        return 3;
    };

    countriesList.sort((a, b) => {
        const tierA = getCountryTier(a.CountryCode);
        const tierB = getCountryTier(b.CountryCode);
        if (tierA !== tierB) {
            return tierA - tierB;
        }
        return a.CName.localeCompare(b.CName, 'zh');
    });

    // Populate mapping and render dropdown immediately
    countriesList.forEach(c => {
        const flag = getFlagEmoji(c.CountryCode);
        countryNames[c.CountryCode] = `${flag} ${c.CName} (${c.CountryCode})`;
    });
    
    // Defer render briefly to ensure DOM loaded
    setTimeout(() => {
        renderCountryOptions(countriesList);
    }, 50);

    // Toggle dropdown
    countrySelectTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = countrySelectContainer.classList.contains('open');
        if (isOpen) {
            closeDropdown();
        } else {
            openDropdown();
        }
    });

    function openDropdown() {
        closeCurrencyDropdown(); // Close currency select
        countrySelectContainer.classList.add('open');
        countrySelectTrigger.classList.remove('input-error');
        countrySearchInput.focus();
        
        // Reset search field and full list
        countrySearchInput.value = '';
        renderCountryOptions(countriesList);
    }

    function closeDropdown() {
        countrySelectContainer.classList.remove('open');
    }

    // Toggle currency dropdown
    currencySelectTrigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = currencySelectContainer.classList.contains('open');
        if (isOpen) {
            closeCurrencyDropdown();
        } else {
            openCurrencyDropdown();
        }
    });

    function openCurrencyDropdown() {
        closeDropdown(); // Close country select
        currencySelectContainer.classList.add('open');
    }

    function closeCurrencyDropdown() {
        currencySelectContainer.classList.remove('open');
    }

    // Close dropdowns when clicking outside
    document.addEventListener('click', (e) => {
        if (!countrySelectContainer.contains(e.target)) {
            closeDropdown();
        }
        if (currencySelectContainer && !currencySelectContainer.contains(e.target)) {
            closeCurrencyDropdown();
        }
    });

    // Handle search input filtering
    countrySearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderCountryOptions(countriesList);
            return;
        }

        // Common country aliases/abbreviations mapping for major logistics destinations
        const aliases = {
            'us': ['usa', 'united states', 'america', '美国', '美'],
            'gb': ['uk', 'united kingdom', 'britain', 'england', '英国', '英'],
            'ca': ['can', 'canada', '加拿大', '加'],
            'au': ['aus', 'australia', '澳大利亚', '澳'],
            'de': ['ger', 'germany', 'deutschland', '德国', '德'],
            'fr': ['fra', 'france', '法国', '法'],
            'jp': ['jpn', 'japan', '日本', '日'],
            'kr': ['kor', 'korea', '韩国', '韩'],
            'ru': ['rus', 'russia', '俄罗斯', '俄'],
            'cn': ['chn', 'china', '中国', '中'],
            'ae': ['uae', 'united arab emirates', '阿联酋'],
            'nz': ['nzl', 'new zealand', '新西兰', '新'],
            'es': ['esp', 'spain', '西班牙', '西'],
            'it': ['ita', 'italy', '意大利', '意'],
            'nl': ['nld', 'netherlands', 'holland', '荷兰', '荷'],
            'be': ['bel', 'belgium', '比利时', '比'],
            'pl': ['pol', 'poland', '波兰', '波'],
            'ch': ['sui', 'che', 'switzerland', 'swiss', '瑞士', '瑞'],
            'sg': ['sgp', 'sin', 'singapore', '新加坡', '新'],
            'my': ['mys', 'mas', 'malaysia', '马来西亚', '马'],
            'ph': ['phl', 'philippines', '菲律宾', '菲'],
            'vn': ['vnm', 'vietnam', '越南', '越'],
            'th': ['tha', 'thailand', '泰国', '泰'],
            'in': ['ind', 'india', '印度', '印'],
            'br': ['bra', 'brazil', '巴西', '巴'],
            'mx': ['mex', 'mexico', '墨西哥', '墨'],
            'za': ['zaf', 'south africa', '南非']
        };

        const filtered = countriesList.filter(c => {
            const code = c.CountryCode.toLowerCase();
            const cname = c.CName.toLowerCase();
            const ename = c.EName ? c.EName.toLowerCase() : '';
            
            // Check standard search fields
            if (code.includes(query) || cname.includes(query) || ename.includes(query)) {
                return true;
            }
            
            // Check aliases mapping
            const countryAliases = aliases[code];
            if (countryAliases) {
                return countryAliases.some(alias => alias.includes(query) || query.includes(alias));
            }
            
            return false;
        });

        renderCountryOptions(filtered);
    });

    // Render country options
    function renderCountryOptions(list) {
        countryOptionsList.innerHTML = '';
        
        if (list.length === 0) {
            const emptyLi = document.createElement('li');
            emptyLi.className = 'no-results';
            emptyLi.textContent = '未找到匹配的国家';
            countryOptionsList.appendChild(emptyLi);
            return;
        }

        list.forEach(c => {
            const li = document.createElement('li');
            const flag = getFlagEmoji(c.CountryCode);
            li.innerHTML = `${flag} ${c.CName} (${c.CountryCode})`;
            li.dataset.code = c.CountryCode;
            
            if (c.CountryCode === selectedCountryCode) {
                li.classList.add('selected');
            }

            li.addEventListener('click', (e) => {
                e.stopPropagation();
                selectCountry(c.CountryCode, flag, c.CName);
            });

            countryOptionsList.appendChild(li);
        });
    }

    function selectCountry(code, flag, name) {
        selectedCountryCode = code;
        quoteCountry.value = code;
        countryTriggerLabel.innerHTML = `${flag} ${name} (${code})`;
        closeDropdown();
    }

    // Currency custom options click selection
    const currencyOptions = currencyOptionsList.querySelectorAll('li');
    currencyOptions.forEach(opt => {
        opt.dataset.value = opt.getAttribute('data-value'); // Ensure dataset is set from attribute
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            const val = opt.dataset.value;
            selectCurrency(val);
        });
    });

    function selectCurrency(val) {
        quoteCurrencyInput.value = val;
        
        const labelText = {
            CNY: 'CNY (¥)',
            USD: 'USD ($)',
            EUR: 'EUR (€)',
            HKD: 'HKD (HK$)'
        };
        currencyTriggerLabel.textContent = labelText[val] || val;

        currencyOptions.forEach(opt => {
            if (opt.dataset.value === val) {
                opt.classList.add('selected');
            } else {
                opt.classList.remove('selected');
            }
        });

        closeCurrencyDropdown();

        if (quoteData && quoteData.length > 0) {
            updateMetrics();
            renderQuotationChannels();
        }
    }

    // Form submit
    quoteForm.addEventListener('submit', (e) => {
        e.preventDefault();
        if (!quoteCountry.value) {
            countrySelectTrigger.classList.add('input-error');
            countrySelectTrigger.focus();
            return;
        }
        performQuotationQuery();
    });

    // Sort toggle
    quoteSortBtn.addEventListener('click', () => {
        if (!quoteData || quoteData.length === 0) return;
        isQuoteSortAscending = !isQuoteSortAscending;
        
        const sortText = quoteSortBtn.querySelector('span');
        if (isQuoteSortAscending) {
            quoteSortBtn.classList.remove('sort-reverse');
            sortText.textContent = '价格从低到高';
        } else {
            quoteSortBtn.classList.add('sort-reverse');
            sortText.textContent = '价格从高到低';
        }
        
        renderQuotationChannels();
    });

    function showState(state) {
        // Hide all states
        welcomeState.classList.remove('active');
        loadingState.classList.remove('active');
        errorState.classList.remove('active');
        quoteResultsState.classList.remove('active');
        
        // Hide metrics initially
        metricsSection.classList.add('hidden');
        
        // Show target state
        if (state === 'welcome') {
            welcomeState.classList.add('active');
        } else if (state === 'loading') {
            loadingState.classList.add('active');
        } else if (state === 'error') {
            errorState.classList.add('active');
        } else if (state === 'results') {
            quoteResultsState.classList.add('active');
            metricsSection.classList.remove('hidden'); // Show metrics on results!
        }
    }

    async function performQuotationQuery() {
        showState('loading');
        
        const country = quoteCountry.value;
        const weight = quoteWeight.value;
        const goodsType = quoteGoodsType.value;
        const postcode = quotePostcode.value.trim();
        const length = quoteLength.value || '1';
        const width = quoteWidth.value || '1';
        const height = quoteHeight.value || '1';

        const params = new URLSearchParams({
            CountryCode: country,
            Weight: weight,
            PackageType: goodsType,
            Length: length,
            Width: width,
            Height: height
        });
        
        if (postcode) {
            params.append('PostCode', postcode);
        }

        const targetUrl = `http://oms.api.yunexpress.com/api/Freight/GetPriceTrial?${params.toString()}`;
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(targetUrl);

        try {
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${authToken}`
                }
            });
            const data = await response.json();
            
            if (response.ok && data.Code === '0000' && data.Items) {
                rawQuoteItems = data.Items; // Store raw API items
                calculateAndRenderQuoteData(); // Dynamic calculation and render
                showState('results');
            } else {
                const errorTitle = document.getElementById('error-title');
                const errorMessage = document.getElementById('error-message');
                errorTitle.textContent = '测算运费失败';
                errorMessage.textContent = data.Message || '云途接口未返回有效报价数据，请核对您的测算参数或目的地代码。';
                showState('error');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            const errorTitle = document.getElementById('error-title');
            const errorMessage = document.getElementById('error-message');
            errorTitle.textContent = '网络请求故障';
            errorMessage.textContent = '无法连接至云途报价接口，请检查您的网络连接或稍后再试。';
            showState('error');
        }
    }

    function updateMetrics() {
        if (!quoteData || quoteData.length === 0) return;

        // 1. Cheapest Channel
        let cheapest = quoteData[0];
        quoteData.forEach(item => {
            const fee = parseFloat(item.TotalFeeCNY) || 0;
            const cheapestFee = parseFloat(cheapest.TotalFeeCNY) || 0;
            if (fee < cheapestFee) {
                cheapest = item;
            }
        });
        
        const cheapestCNY = cheapest.TotalFeeCNY;
        const target = getSelectedCurrency();
        if (target === 'CNY') {
            metricCheapestVal.innerHTML = `¥${cheapestCNY.toFixed(2)}`;
        } else {
            const cheapestDisplay = getDisplayPrice(cheapestCNY);
            const cheapestSymbol = getCurrencySymbol();
            metricCheapestVal.innerHTML = `¥${cheapestCNY.toFixed(2)} <span class="metric-converted-sub">≈ ${cheapestSymbol}${cheapestDisplay.toFixed(2)}</span>`;
        }
        metricCheapestName.textContent = cheapest.CName || cheapest.Code;

        // 2. Fastest Channel (smallest min day in "X-Y" range)
        let fastest = quoteData[0];
        let fastestMinDays = getMinDays(fastest.DeliveryDays);
        
        quoteData.forEach(item => {
            const minDays = getMinDays(item.DeliveryDays);
            if (minDays < fastestMinDays) {
                fastest = item;
                fastestMinDays = minDays;
            }
        });
        
        metricFastestVal.textContent = fastest.DeliveryDays ? `${fastest.DeliveryDays} 天` : '未提供';
        metricFastestName.textContent = fastest.CName || fastest.Code;

        // 3. Total Channels
        metricTotalVal.textContent = `${quoteData.length} 个`;
    }

    // Parse "3-8" or "7" delivery days string to extract minimum days
    function getMinDays(daysString) {
        if (!daysString) return 999;
        const match = daysString.match(/^(\d+)/);
        return match ? parseInt(match[1]) : 999;
    }

    function getGoodsTypeClass(goodsType) {
        if (!goodsType) return 'type-general';
        const typeStr = goodsType.toLowerCase();
        if (typeStr.includes('普')) return 'type-general';
        if (typeStr.includes('电') || typeStr.includes('电池') || typeStr.includes('battery')) return 'type-battery';
        if (typeStr.includes('特') || typeStr.includes('敏') || typeStr.includes('special') || typeStr.includes('危险')) return 'type-special';
        return 'type-general';
    }

    function getChannelIcon(name) {
        if (!name) return '✈️';
        if (name.includes('小包') || name.includes('Post') || name.includes('Mail')) return '✉️';
        if (name.includes('特快') || name.includes('Faster') || name.includes('Priority') || name.includes('快') || name.includes('Express')) return '🚀';
        if (name.includes('专线') || name.includes('Direct') || name.includes('Driect') || name.includes('Line')) return '✈️';
        return '📦';
    }

    function getExcelTransit(excelMap, cname) {
        if (!excelMap || !cname) return null;
        
        const cleanCName = cname.trim().replace(/\s+/g, '');
        if (excelMap[cleanCName]) return excelMap[cleanCName];
        
        // Explicit alias map to prevent substring collision (e.g. "俄罗斯" matching "白俄罗斯")
        const countryAliases = {
            '阿拉伯联合酋长国': ['阿联酋', '阿拉伯联合酋长国'],
            '阿联酋': ['阿拉伯联合酋长国', '阿联酋'],
            '俄罗斯': ['俄罗斯联邦', '俄罗斯'],
            '俄罗斯联邦': ['俄罗斯', '俄罗斯联邦']
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

    function renderQuotationChannels() {
        quoteChannelsContainer.innerHTML = '';
        
        if (!quoteData || quoteData.length === 0) {
            quoteChannelsContainer.innerHTML = '<div class="timeline-empty">暂无可用运输渠道报价</div>';
            return;
        }

        const selectedCountryObj = countriesList.find(c => c.CountryCode === selectedCountryCode);
        const countryCName = selectedCountryObj ? selectedCountryObj.CName : '';

        // Sort quoteData by total fee in CNY
        quoteData.sort((a, b) => {
            const feeA = parseFloat(a.TotalFeeCNY) || 0;
            const feeB = parseFloat(b.TotalFeeCNY) || 0;
            return isQuoteSortAscending ? feeA - feeB : feeB - feeA;
        });

        const target = getSelectedCurrency();
        const targetSymbol = getCurrencySymbol();

        quoteData.forEach((channel) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'quote-channel-card';

            const total = getDisplayPrice(channel.TotalFeeCNY);
            const sf = getDisplayPrice(channel.ShippingFeeCNY);
            const rf = getDisplayPrice(channel.RegistrationFeeCNY);
            const ff = getDisplayPrice(channel.FuelFeeCNY);
            const sundry = getDisplayPrice(channel.SundryFeeCNY);
            const tariff = getDisplayPrice(channel.TariffPrepayFeeCNY);
            const insured = getDisplayPrice(channel.InsuredFeeCNY);
            const sig = getDisplayPrice(channel.SignatureFeeCNY);
            const pack = getDisplayPrice(channel.PackagingFeeCNY);
            
            // Helper to format individual breakdown sub-fees in the selected currency
            const formatBreakdownItem = (label, cnyVal, convertedVal) => {
                if (cnyVal === null || cnyVal === undefined || cnyVal <= 0) return '';
                if (target === 'CNY') {
                    return `${label}: ¥${parseFloat(cnyVal).toFixed(2)}`;
                }
                return `${label}: ${targetSymbol}${convertedVal.toFixed(2)}`;
            };

            // Generate detailed billing tooltip / breakdown subtext
            const breakdownParts = [];
            const sfItem = formatBreakdownItem('运费', channel.ShippingFeeCNY, sf);
            if (sfItem) breakdownParts.push(sfItem);
            const rfItem = formatBreakdownItem('挂号', channel.RegistrationFeeCNY, rf);
            if (rfItem) breakdownParts.push(rfItem);
            const ffItem = formatBreakdownItem('燃油', channel.FuelFeeCNY, ff);
            if (ffItem) breakdownParts.push(ffItem);
            const sundryItem = formatBreakdownItem('杂费', channel.SundryFeeCNY, sundry);
            if (sundryItem) breakdownParts.push(sundryItem);
            const tariffItem = formatBreakdownItem('预付税', channel.TariffPrepayFeeCNY, tariff);
            if (tariffItem) breakdownParts.push(tariffItem);
            const insuredItem = formatBreakdownItem('保价', channel.InsuredFeeCNY, insured);
            if (insuredItem) breakdownParts.push(insuredItem);
            const sigItem = formatBreakdownItem('签名', channel.SignatureFeeCNY, sig);
            if (sigItem) breakdownParts.push(sigItem);
            const packItem = formatBreakdownItem('打包费', channel.PackagingFeeCNY, pack);
            if (packItem) breakdownParts.push(packItem);
            const breakdownText = breakdownParts.join(' + ');

            const excelTransitMap = transitTimesData[channel.Code];
            const excelTransit = getExcelTransit(excelTransitMap, countryCName);

            cardEl.innerHTML = `
                <div class="channel-brand-icon-area">
                    <div class="channel-brand-icon-bg">
                        <span>${getChannelIcon(channel.CName || channel.Code)}</span>
                    </div>
                </div>
                <div class="channel-info-area">
                    <div class="channel-title-row">
                        <span class="channel-name">${channel.CName || '未知渠道'}</span>
                        <span class="channel-code">${channel.Code || '-'}</span>
                        ${channel.DeliveryDays ? `<span class="channel-days-badge transit-api-badge">⏱️ API时效: ${channel.DeliveryDays} 天</span>` : ''}
                        ${excelTransit ? `<span class="channel-days-badge transit-excel-badge">📄 报价表时效: ${excelTransit}</span>` : ''}
                    </div>
                    <div class="channel-ename">${channel.EName || ''}</div>
                    <div class="channel-meta-row">
                        <div class="channel-meta-item goods-type-badge ${getGoodsTypeClass(channel.GoodsType)}">
                            <span>属性: <strong>${channel.GoodsType || '普货'}</strong></span>
                        </div>
                        <div class="channel-meta-item">
                            <span>计费重量: <strong>${parseFloat(channel.Weight).toFixed(3)} kg</strong></span>
                        </div>
                        ${pack > 0 ? `
                        <div class="channel-meta-item packaging-fee">
                            <span>📦 打包费: <strong>¥${parseFloat(channel.PackagingFeeCNY).toFixed(2)}${target !== 'CNY' ? ` (≈ ${targetSymbol}${pack.toFixed(2)})` : ''}</strong></span>
                        </div>` : ''}
                        ${channel.Remark ? `
                        <div class="channel-meta-item channel-remark-tag">
                            <span>备注: <strong>${channel.Remark}</strong></span>
                        </div>` : ''}
                    </div>
                </div>
                <div class="channel-price-area">
                    <div class="channel-total-badge">
                        <span class="amount">¥${parseFloat(channel.TotalFeeCNY).toFixed(2)}</span>
                    </div>
                    ${target !== 'CNY' ? `<div class="channel-converted-badge">≈ ${targetSymbol}${total.toFixed(2)}</div>` : ''}
                    <div class="channel-price-breakdown">${breakdownText}</div>
                </div>
            `;
            
            quoteChannelsContainer.appendChild(cardEl);
        });
    }

    // Dynamic calculation and rendering with custom admin parameters
    function calculateAndRenderQuoteData() {
        if (!rawQuoteItems || rawQuoteItems.length === 0) return;

        quoteData = rawQuoteItems.map(item => {
            const clonedItem = { ...item };
            const originalCurrency = clonedItem.Currency || 'CNY';
            const usdToCnyRate = EXCHANGE_RATES['USD'];
            
            const toCNY = (val) => {
                const num = parseFloat(val) || 0;
                return originalCurrency === 'USD' ? num * usdToCnyRate : num;
            };
            
            // Convert original values to CNY
            const originalShippingFee = toCNY(clonedItem.ShippingFee);
            const originalRegistrationFee = toCNY(clonedItem.RegistrationFee);
            const originalFuelFee = toCNY(clonedItem.FuelFee);
            const originalSundryFee = toCNY(clonedItem.SundryFee);
            const originalTariffPrepayFee = toCNY(clonedItem.TariffPrepayFee);
            const originalInsuredFee = toCNY(clonedItem.InsuredFee);
            const originalSignatureFee = toCNY(clonedItem.SignatureFee);
            const originalTotalFee = toCNY(clonedItem.TotalFee);
            
            // Add profit markup (SYSTEM_PROFIT_MARGIN) in CNY
            clonedItem.ShippingFeeCNY = originalShippingFee * SYSTEM_PROFIT_MARGIN;
            clonedItem.RegistrationFeeCNY = originalRegistrationFee * SYSTEM_PROFIT_MARGIN;
            clonedItem.FuelFeeCNY = originalFuelFee * SYSTEM_PROFIT_MARGIN;
            clonedItem.SundryFeeCNY = originalSundryFee * SYSTEM_PROFIT_MARGIN;
            
            if (clonedItem.TariffPrepayFee !== null && clonedItem.TariffPrepayFee !== undefined) {
                clonedItem.TariffPrepayFeeCNY = originalTariffPrepayFee * SYSTEM_PROFIT_MARGIN;
            } else {
                clonedItem.TariffPrepayFeeCNY = null;
            }
            if (clonedItem.InsuredFee !== null && clonedItem.InsuredFee !== undefined) {
                clonedItem.InsuredFeeCNY = originalInsuredFee * SYSTEM_PROFIT_MARGIN;
            } else {
                clonedItem.InsuredFeeCNY = null;
            }
            if (clonedItem.SignatureFee !== null && clonedItem.SignatureFee !== undefined) {
                clonedItem.SignatureFeeCNY = originalSignatureFee * SYSTEM_PROFIT_MARGIN;
            } else {
                clonedItem.SignatureFeeCNY = null;
            }
            
            // Add packaging fee (SYSTEM_PACKAGING_FEE) in CNY
            clonedItem.PackagingFeeCNY = SYSTEM_PACKAGING_FEE;
            
            // Total is marked up by margin + packaging fee
            clonedItem.TotalFeeCNY = (originalTotalFee * SYSTEM_PROFIT_MARGIN) + SYSTEM_PACKAGING_FEE;
            
            return clonedItem;
        });

        // Update summary details text
        const country = quoteCountry.value;
        const weight = quoteWeight.value;
        const goodsType = quoteGoodsType.value;
        const postcode = quotePostcode.value.trim();
        const length = quoteLength.value || '1';
        const width = quoteWidth.value || '1';
        const height = quoteHeight.value || '1';
        const countryText = countryNames[country] || country;
        const goodsTypeText = quoteGoodsType.options[quoteGoodsType.selectedIndex].text;
        
        quoteSummaryDetails.textContent = `当前参数: 目的国: ${countryText} | 重量: ${parseFloat(weight).toFixed(3)} kg | 尺寸: ${length}×${width}×${height} cm | 类型: ${goodsTypeText} ${postcode ? `| 邮编: ${postcode}` : ''}`;

        updateMetrics();
        renderQuotationChannels();
    }

    // Admin Panel Logic
    const adminTrigger = document.getElementById('admin-trigger');
    const adminModal = document.getElementById('admin-modal');
    const adminModalClose = document.getElementById('admin-modal-close');
    const adminStateVerify = document.getElementById('admin-state-verify');
    const adminStatePanel = document.getElementById('admin-state-panel');
    
    const adminPasswordInput = document.getElementById('admin-password-input');
    const adminVerifyBtn = document.getElementById('admin-verify-btn');
    const adminVerifyError = document.getElementById('admin-verify-error');
    
    const adminProfitInput = document.getElementById('admin-profit-input');
    const adminPackInput = document.getElementById('admin-pack-input');
    const adminTokenInput = document.getElementById('admin-token-input');
    const adminApiBaseInput = document.getElementById('admin-api-base-input');
    const adminBackendUrlInput = document.getElementById('admin-backend-url-input');
    const adminSaveStatus = document.getElementById('admin-save-status');
    const adminSaveBtn = document.getElementById('admin-save-btn');
    const adminLogoutBtn = document.getElementById('admin-logout-btn');

    // Load initial values from localStorage (with fallbacks)
    let SYSTEM_PROFIT_MARGIN = parseFloat(localStorage.getItem('gp_profit_margin')) || 1.22;
    let SYSTEM_PACKAGING_FEE = localStorage.getItem('gp_packaging_fee') !== null && !isNaN(parseFloat(localStorage.getItem('gp_packaging_fee'))) ? parseFloat(localStorage.getItem('gp_packaging_fee')) : 2.0;

    // Set initial input states
    if (adminProfitInput) {
        adminProfitInput.value = Math.round((SYSTEM_PROFIT_MARGIN - 1) * 100);
    }
    if (adminPackInput) {
        adminPackInput.value = SYSTEM_PACKAGING_FEE;
    }
    if (adminTokenInput) {
        adminTokenInput.value = localStorage.getItem('gp_github_token') || '';
    }
    if (adminApiBaseInput) {
        adminApiBaseInput.value = localStorage.getItem('gp_github_api_base') || '';
    }
    if (adminBackendUrlInput) {
        adminBackendUrlInput.value = localStorage.getItem('gp_backend_url') || '';
    }

    // Modal Events
    if (adminTrigger) {
        adminTrigger.addEventListener('click', () => {
            adminModal.classList.add('open');
            adminVerifyError.textContent = '';
            adminPasswordInput.value = '';
            adminPasswordInput.focus();
        });
    }

    if (adminModalClose) {
        adminModalClose.addEventListener('click', () => {
            adminModal.classList.remove('open');
        });
    }

    if (adminModal) {
        adminModal.addEventListener('click', (e) => {
            if (e.target === adminModal) {
                adminModal.classList.remove('open');
            }
        });
    }

    // Helper to calculate SHA-256 hash
    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex;
    }

    // Verification handler
    async function performAdminVerification() {
        const pwd = adminPasswordInput.value;
        const hashedPwd = await sha256(pwd);
        if (hashedPwd === '8b940be7fb78aaa6b6567dd7a3987996947460df1c668e698eb92ca77e425349') {
            adminVerifyError.textContent = '';
            adminStateVerify.classList.add('admin-state-hidden');
            adminStateVerify.classList.remove('admin-state-active');
            adminStatePanel.classList.remove('admin-state-hidden');
            adminStatePanel.classList.add('admin-state-active');
            
            // Sync values to inputs
            adminProfitInput.value = Math.round((SYSTEM_PROFIT_MARGIN - 1) * 100);
            adminPackInput.value = SYSTEM_PACKAGING_FEE;
            if (adminTokenInput) {
                adminTokenInput.value = localStorage.getItem('gp_github_token') || '';
            }
            if (adminApiBaseInput) {
                adminApiBaseInput.value = localStorage.getItem('gp_github_api_base') || '';
            }
            if (adminBackendUrlInput) {
                adminBackendUrlInput.value = localStorage.getItem('gp_backend_url') || '';
            }
            adminSaveStatus.textContent = '';
        } else {
            adminVerifyError.textContent = '密码错误，认证失败！';
            const card = adminModal.querySelector('.admin-modal-card');
            if (card) {
                card.classList.add('admin-shake');
                setTimeout(() => card.classList.remove('admin-shake'), 300);
            }
        }
    }

    async function saveConfigToGitHub(token, profit, pack) {
        adminSaveStatus.style.color = 'var(--text-secondary)';
        adminSaveStatus.textContent = '正在进行 GitHub 云端同步...';

        let useFallback = (window.location.protocol === 'file:' || window.location.hostname === '' || window.location.hostname.includes('github.io'));

        try {
            // First, try using our backend proxy (/api/github-sync)
            let backendUrl = (localStorage.getItem('gp_backend_url') || '').trim();
            if (backendUrl && !backendUrl.startsWith('http://') && !backendUrl.startsWith('https://')) {
                backendUrl = 'https://' + backendUrl;
            }
            backendUrl = backendUrl.replace(/\/+$/, '');

            const proxyUrl = backendUrl ? `${backendUrl}/api/github-sync` : '/api/github-sync';
            const response = await fetch(proxyUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    token,
                    profit_margin: profit,
                    packaging_fee: pack
                })
            });

            if (response.ok) {
                const resData = await response.json();
                if (resData.success) {
                    adminSaveStatus.style.color = 'var(--success)';
                    adminSaveStatus.textContent = '配置已同步至云端！部署系统会在1分钟内自动刷新生效。';
                    
                    // Close modal softly
                    setTimeout(() => {
                        adminModal.classList.remove('open');
                    }, 2000);
                    return;
                } else {
                    throw new Error(resData.message || '未知错误');
                }
            } else if (response.status === 404) {
                // If backend proxy is not deployed (e.g. running on static server directly)
                console.log('Backend proxy not found (404), falling back to client-side direct sync.');
                useFallback = true;
                throw new Error('Backend proxy not found (404)');
            } else {
                const resData = await response.json().catch(() => ({}));
                throw new Error(resData.message || `HTTP ${response.status}`);
            }
        } catch (proxyErr) {
            if (useFallback || (proxyErr instanceof TypeError && proxyErr.message.includes('Failed to fetch'))) {
                console.warn('Backend proxy sync failed, falling back to direct client-side sync:', proxyErr);
            } else {
                throw new Error(`[后端同步服务错误] ${proxyErr.message}`);
            }
        }

        // --- Client-side direct sync fallback (for local/static runs) ---
        const repo = 'gp928150-max/gp-Yuntu-Logistics-Quotation';
        let apiBase = (localStorage.getItem('gp_github_api_base') || 'https://api.github.com').trim();
        if (!apiBase) {
            apiBase = 'https://api.github.com';
        }
        apiBase = apiBase.replace(/\/+$/, '');
        
        try {
            const configObj = {
                profit_margin: profit,
                packaging_fee: pack
            };
            const configString = JSON.stringify(configObj, null, 2);
            const base64Content = btoa(configString);
            const paths = ['public/config.json', 'config.json'];
            
            for (const path of paths) {
                const url = `${apiBase}/repos/${repo}/contents/${path}`;
                
                // 1. Get SHA of existing file (if any)
                let sha = '';
                try {
                    const getRes = await fetch(url, {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Cache-Control': 'no-cache'
                        }
                    });

                    if (getRes.ok) {
                        const fileData = await getRes.json();
                        sha = fileData.sha;
                    } else if (getRes.status !== 404) {
                        throw new Error(`获取 ${path} 的 SHA 失败: HTTP ${getRes.status}`);
                    }
                } catch (fetchErr) {
                    if (fetchErr instanceof TypeError && fetchErr.message.includes('Failed to fetch')) {
                        const isGithubPages = window.location.hostname.includes('github.io');
                        if (isGithubPages) {
                            throw new Error(`连接 GitHub 接口失败。由于您部署在 GitHub Pages 静态托管上，国内访问受阻，请确保您在下方配置了 Vercel 后端服务地址来进行安全中转。`);
                        } else {
                            throw new Error(`连接 GitHub 接口失败。如国内网络受阻，建议启用 VPN 代理，或在下方配置可用的 GitHub API 镜像/代理。`);
                        }
                    }
                    throw fetchErr;
                }

                // 2. Put updated config
                const putBody = {
                    message: `Update ${path} from admin panel (V1.5.15)`,
                    content: base64Content
                };
                if (sha) {
                    putBody.sha = sha;
                }

                try {
                    const putRes = await fetch(url, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/vnd.github.v3+json'
                        },
                        body: JSON.stringify(putBody)
                    });

                    if (!putRes.ok) {
                        const errData = await putRes.json();
                        throw new Error(`更新 ${path} 失败: ${errData.message || `HTTP ${putRes.status}`}`);
                    }
                } catch (fetchErr) {
                    if (fetchErr instanceof TypeError && fetchErr.message.includes('Failed to fetch')) {
                        const isGithubPages = window.location.hostname.includes('github.io');
                        if (isGithubPages) {
                            throw new Error(`连接 GitHub 接口失败。由于您部署在 GitHub Pages 静态托管上，国内访问受阻，请确保您在下方配置了 Vercel 后端服务地址来进行安全中转。`);
                        } else {
                            throw new Error(`连接 GitHub 接口失败。如国内网络受阻，建议启用 VPN 代理，或在下方配置可用的 GitHub API 镜像/代理。`);
                        }
                    }
                    throw fetchErr;
                }
            }

            adminSaveStatus.style.color = 'var(--success)';
            adminSaveStatus.textContent = '配置已同步至云端！部署系统会在1分钟内自动刷新生效。';
            
            // Close modal softly
            setTimeout(() => {
                adminModal.classList.remove('open');
            }, 2000);
        } catch (error) {
            console.error('Error saving config to GitHub directly:', error);
            adminSaveStatus.style.color = 'var(--error)';
            adminSaveStatus.textContent = `云同步失败: ${error.message} (配置已在本地生效)`;
        }
    }

    if (adminVerifyBtn) {
        adminVerifyBtn.addEventListener('click', performAdminVerification);
    }
    if (adminPasswordInput) {
        adminPasswordInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') performAdminVerification();
        });
    }

    // Save parameters logic
    if (adminSaveBtn) {
        adminSaveBtn.addEventListener('click', () => {
            const percentage = parseFloat(adminProfitInput.value);
            const packFee = parseFloat(adminPackInput.value);
            
            if (isNaN(percentage) || percentage < 0) {
                adminSaveStatus.style.color = 'var(--error)';
                adminSaveStatus.textContent = '利润比例必须是大于或等于 0 的有效数字！';
                return;
            }
            if (isNaN(packFee) || packFee < 0) {
                adminSaveStatus.style.color = 'var(--error)';
                adminSaveStatus.textContent = '打包费用必须是大于或等于 0 的有效数字！';
                return;
            }
            
            // Store and update globals
            SYSTEM_PROFIT_MARGIN = 1 + (percentage / 100);
            SYSTEM_PACKAGING_FEE = packFee;
            
            localStorage.setItem('gp_profit_margin', SYSTEM_PROFIT_MARGIN);
            localStorage.setItem('gp_packaging_fee', SYSTEM_PACKAGING_FEE);
            
            // Recalculate and redraw quotation list instantly
            if (rawQuoteItems && rawQuoteItems.length > 0) {
                calculateAndRenderQuoteData();
            }
            
            // GitHub cloud sync
            if (adminTokenInput) {
                const tokenVal = adminTokenInput.value.trim();
                
                // Save custom API base proxy if configured
                if (adminApiBaseInput) {
                    const apiBaseVal = adminApiBaseInput.value.trim();
                    if (apiBaseVal) {
                        localStorage.setItem('gp_github_api_base', apiBaseVal);
                    } else {
                        localStorage.removeItem('gp_github_api_base');
                    }
                }

                // Save custom backend API proxy if configured
                if (adminBackendUrlInput) {
                    const backendUrlVal = adminBackendUrlInput.value.trim();
                    if (backendUrlVal) {
                        localStorage.setItem('gp_backend_url', backendUrlVal);
                    } else {
                        localStorage.removeItem('gp_backend_url');
                    }
                }
                
                if (tokenVal) {
                    localStorage.setItem('gp_github_token', tokenVal);
                    saveConfigToGitHub(tokenVal, SYSTEM_PROFIT_MARGIN, SYSTEM_PACKAGING_FEE);
                } else {
                    localStorage.removeItem('gp_github_token');
                    adminSaveStatus.style.color = 'var(--success)';
                    adminSaveStatus.textContent = '配置已在本地生效（未配置 GitHub Token，无法云同步）';
                    
                    // Close modal softly
                    setTimeout(() => {
                        adminModal.classList.remove('open');
                    }, 1200);
                }
            } else {
                adminSaveStatus.style.color = 'var(--success)';
                adminSaveStatus.textContent = '配置保存成功，所有价格已完成即时重算！';
                
                // Close modal softly
                setTimeout(() => {
                    adminModal.classList.remove('open');
                }, 1200);
            }
        });
    }

    // Logout logic
    if (adminLogoutBtn) {
        adminLogoutBtn.addEventListener('click', () => {
            adminStatePanel.classList.add('admin-state-hidden');
            adminStatePanel.classList.remove('admin-state-active');
            adminStateVerify.classList.remove('admin-state-hidden');
            adminStateVerify.classList.add('admin-state-active');
            adminPasswordInput.value = '';
            adminPasswordInput.focus();
        });
    }

    // Fetch live exchange rates dynamically
    fetchRealTimeExchangeRates();
    loadTransitTimes();
    loadConfig();
});
