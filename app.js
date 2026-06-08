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
    let isQuoteSortAscending = true; // Lowest price first by default
    let selectedCountryCode = '';

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

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!countrySelectContainer.contains(e.target)) {
            closeDropdown();
        }
    });

    // Handle search input filtering
    countrySearchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
            renderCountryOptions(countriesList);
            return;
        }

        const filtered = countriesList.filter(c => {
            const code = c.CountryCode.toLowerCase();
            const cname = c.CName.toLowerCase();
            const ename = c.EName ? c.EName.toLowerCase() : '';
            return code.includes(query) || cname.includes(query) || ename.includes(query);
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

    // Currency toggle change
    const quoteCurrencySelect = document.getElementById('quote-currency');
    if (quoteCurrencySelect) {
        quoteCurrencySelect.addEventListener('change', () => {
            if (!quoteData || quoteData.length === 0) return;
            updateMetrics();
            renderQuotationChannels();
        });
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
                // Apply 22% profit markup and 2 RMB packaging fee client-side in CNY
                quoteData = data.Items.map(item => {
                    const originalCurrency = item.Currency || 'CNY';
                    const usdToCnyRate = EXCHANGE_RATES['USD'];
                    
                    const toCNY = (val) => {
                        const num = parseFloat(val) || 0;
                        return originalCurrency === 'USD' ? num * usdToCnyRate : num;
                    };
                    
                    // Convert original values to CNY
                    const originalShippingFee = toCNY(item.ShippingFee);
                    const originalRegistrationFee = toCNY(item.RegistrationFee);
                    const originalFuelFee = toCNY(item.FuelFee);
                    const originalSundryFee = toCNY(item.SundryFee);
                    const originalTariffPrepayFee = toCNY(item.TariffPrepayFee);
                    const originalInsuredFee = toCNY(item.InsuredFee);
                    const originalSignatureFee = toCNY(item.SignatureFee);
                    const originalTotalFee = toCNY(item.TotalFee);
                    
                    // Add 22% profit markup (1.22) in CNY
                    item.ShippingFeeCNY = originalShippingFee * 1.22;
                    item.RegistrationFeeCNY = originalRegistrationFee * 1.22;
                    item.FuelFeeCNY = originalFuelFee * 1.22;
                    item.SundryFeeCNY = originalSundryFee * 1.22;
                    
                    if (item.TariffPrepayFee !== null && item.TariffPrepayFee !== undefined) {
                        item.TariffPrepayFeeCNY = originalTariffPrepayFee * 1.22;
                    } else {
                        item.TariffPrepayFeeCNY = null;
                    }
                    if (item.InsuredFee !== null && item.InsuredFee !== undefined) {
                        item.InsuredFeeCNY = originalInsuredFee * 1.22;
                    } else {
                        item.InsuredFeeCNY = null;
                    }
                    if (item.SignatureFee !== null && item.SignatureFee !== undefined) {
                        item.SignatureFeeCNY = originalSignatureFee * 1.22;
                    } else {
                        item.SignatureFeeCNY = null;
                    }
                    
                    // Add packaging fee (2 RMB)
                    item.PackagingFeeCNY = 2;
                    
                    // Total is marked up by 1.22 + 2 packaging fee
                    item.TotalFeeCNY = (originalTotalFee * 1.22) + 2;
                    
                    return item;
                });

                // Update summary details text
                const countryText = countryNames[country] || country;
                const goodsTypeText = quoteGoodsType.options[quoteGoodsType.selectedIndex].text;
                quoteSummaryDetails.textContent = `当前参数: 目的国: ${countryText} | 重量: ${parseFloat(weight).toFixed(3)} kg | 尺寸: ${length}×${width}×${height} cm | 类型: ${goodsTypeText} ${postcode ? `| 邮编: ${postcode}` : ''}`;
                
                updateMetrics();
                renderQuotationChannels();
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
        
        const cheapestDisplay = getDisplayPrice(cheapest.TotalFeeCNY);
        const cheapestSymbol = getCurrencySymbol();
        metricCheapestVal.textContent = `${cheapestSymbol}${cheapestDisplay.toFixed(2)}`;
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

    function renderQuotationChannels() {
        quoteChannelsContainer.innerHTML = '';
        
        if (!quoteData || quoteData.length === 0) {
            quoteChannelsContainer.innerHTML = '<div class="timeline-empty">暂无可用运输渠道报价</div>';
            return;
        }

        // Sort quoteData by total fee in CNY
        quoteData.sort((a, b) => {
            const feeA = parseFloat(a.TotalFeeCNY) || 0;
            const feeB = parseFloat(b.TotalFeeCNY) || 0;
            return isQuoteSortAscending ? feeA - feeB : feeB - feeA;
        });

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
            
            // Generate detailed billing tooltip / breakdown subtext
            const breakdownParts = [];
            if (sf > 0) breakdownParts.push(`运费:${targetSymbol}${sf.toFixed(2)}`);
            if (rf > 0) breakdownParts.push(`挂号:${targetSymbol}${rf.toFixed(2)}`);
            if (ff > 0) breakdownParts.push(`燃油:${targetSymbol}${ff.toFixed(2)}`);
            if (sundry > 0) breakdownParts.push(`杂费:${targetSymbol}${sundry.toFixed(2)}`);
            if (tariff > 0) breakdownParts.push(`预付税:${targetSymbol}${tariff.toFixed(2)}`);
            if (insured > 0) breakdownParts.push(`保价:${targetSymbol}${insured.toFixed(2)}`);
            if (sig > 0) breakdownParts.push(`签名:${targetSymbol}${sig.toFixed(2)}`);
            if (pack > 0) breakdownParts.push(`打包费:${targetSymbol}${pack.toFixed(2)}`);
            const breakdownText = breakdownParts.join(' + ');

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
                        ${channel.DeliveryDays ? `<span class="channel-days-badge">⏱️ ${channel.DeliveryDays} 天</span>` : ''}
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
                            <span>📦 打包费: <strong>${targetSymbol}${pack.toFixed(2)}</strong></span>
                        </div>` : ''}
                        ${channel.Remark ? `
                        <div class="channel-meta-item channel-remark-tag">
                            <span>备注: <strong>${channel.Remark}</strong></span>
                        </div>` : ''}
                    </div>
                </div>
                <div class="channel-price-area">
                    <div class="channel-total-badge">
                        <span class="currency">${targetSymbol}</span>
                        <span class="amount">${total.toFixed(2)}</span>
                    </div>
                    <div class="channel-price-breakdown">${breakdownText}</div>
                </div>
            `;
            
            quoteChannelsContainer.appendChild(cardEl);
        });
    }
});
