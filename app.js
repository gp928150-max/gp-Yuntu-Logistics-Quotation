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
    let countriesList = [];
    let selectedCountryCode = '';

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

    // Load country list on startup
    async function loadCountries() {
        try {
            const targetUrl = 'http://oms.api.yunexpress.com/api/Common/GetCountry';
            const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl);
            
            const response = await fetch(proxyUrl, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'Authorization': `Basic ${authToken}`
                }
            });
            const data = await response.json();
            
            if (response.ok && data.Code === '0000' && data.Items) {
                countriesList = data.Items;
                
                // Populate mapping
                countriesList.forEach(c => {
                    const flag = getFlagEmoji(c.CountryCode);
                    countryNames[c.CountryCode] = `${flag} ${c.CName} (${c.CountryCode})`;
                });
                
                renderCountryOptions(countriesList);
            } else {
                countryOptionsList.innerHTML = '<li class="no-results">加载国家列表失败</li>';
                console.error('Failed to load countries:', data.Message || 'API error');
            }
        } catch (error) {
            countryOptionsList.innerHTML = '<li class="no-results">加载国家列表故障</li>';
            console.error('Error loading countries:', error);
        }
    }
    
    loadCountries();

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
        const proxyUrl = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(targetUrl);

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
                // Apply 13% profit markup and 2 RMB packaging fee client-side
                quoteData = data.Items.map(item => {
                    const originalTotal = parseFloat(item.TotalFee) || 0;
                    
                    // Add 13% profit to individual fields
                    item.ShippingFee = (parseFloat(item.ShippingFee) || 0) * 1.13;
                    item.RegistrationFee = (parseFloat(item.RegistrationFee) || 0) * 1.13;
                    item.FuelFee = (parseFloat(item.FuelFee) || 0) * 1.13;
                    item.SundryFee = (parseFloat(item.SundryFee) || 0) * 1.13;
                    
                    if (item.TariffPrepayFee !== null && item.TariffPrepayFee !== undefined) {
                        item.TariffPrepayFee = (parseFloat(item.TariffPrepayFee) || 0) * 1.13;
                    }
                    if (item.InsuredFee !== null && item.InsuredFee !== undefined) {
                        item.InsuredFee = (parseFloat(item.InsuredFee) || 0) * 1.13;
                    }
                    if (item.SignatureFee !== null && item.SignatureFee !== undefined) {
                        item.SignatureFee = (parseFloat(item.SignatureFee) || 0) * 1.13;
                    }
                    
                    // Add packaging fee (2 RMB)
                    item.PackagingFee = 2;
                    
                    // Total is marked up by 1.13 + 2 packaging fee
                    item.TotalFee = (originalTotal * 1.13) + 2;
                    
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
            const fee = parseFloat(item.TotalFee) || 0;
            const cheapestFee = parseFloat(cheapest.TotalFee) || 0;
            if (fee < cheapestFee) {
                cheapest = item;
            }
        });
        
        const cheapestSymbol = cheapest.Currency === 'USD' ? '$' : '¥';
        metricCheapestVal.textContent = `${cheapestSymbol}${parseFloat(cheapest.TotalFee).toFixed(2)}`;
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

        // Sort quoteData by total fee
        quoteData.sort((a, b) => {
            const feeA = parseFloat(a.TotalFee) || 0;
            const feeB = parseFloat(b.TotalFee) || 0;
            return isQuoteSortAscending ? feeA - feeB : feeB - feeA;
        });

        quoteData.forEach((channel) => {
            const cardEl = document.createElement('div');
            cardEl.className = 'quote-channel-card';

            const total = parseFloat(channel.TotalFee) || 0;
            const sf = parseFloat(channel.ShippingFee) || 0;
            const rf = parseFloat(channel.RegistrationFee) || 0;
            const ff = parseFloat(channel.FuelFee) || 0;
            const sundry = parseFloat(channel.SundryFee) || 0;
            const tariff = parseFloat(channel.TariffPrepayFee) || 0;
            const insured = parseFloat(channel.InsuredFee) || 0;
            const sig = parseFloat(channel.SignatureFee) || 0;
            const pack = parseFloat(channel.PackagingFee) || 0;
            
            // Generate detailed billing tooltip / breakdown subtext
            const breakdownParts = [];
            if (sf > 0) breakdownParts.push(`运费:¥${sf.toFixed(2)}`);
            if (rf > 0) breakdownParts.push(`挂号:¥${rf.toFixed(2)}`);
            if (ff > 0) breakdownParts.push(`燃油:¥${ff.toFixed(2)}`);
            if (sundry > 0) breakdownParts.push(`杂费:¥${sundry.toFixed(2)}`);
            if (tariff > 0) breakdownParts.push(`预付税:¥${tariff.toFixed(2)}`);
            if (insured > 0) breakdownParts.push(`保价:¥${insured.toFixed(2)}`);
            if (sig > 0) breakdownParts.push(`签名:¥${sig.toFixed(2)}`);
            if (pack > 0) breakdownParts.push(`打包费:¥${pack.toFixed(2)}`);
            const breakdownText = breakdownParts.join(' + ');

            const currencySymbol = channel.Currency === 'USD' ? '$' : '¥';

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
                            <span>📦 打包费: <strong>¥${pack.toFixed(2)}</strong></span>
                        </div>` : ''}
                        ${channel.Remark ? `
                        <div class="channel-meta-item channel-remark-tag">
                            <span>备注: <strong>${channel.Remark}</strong></span>
                        </div>` : ''}
                    </div>
                </div>
                <div class="channel-price-area">
                    <div class="channel-total-badge">
                        <span class="currency">${currencySymbol}</span>
                        <span class="amount">${total.toFixed(2)}</span>
                    </div>
                    <div class="channel-price-breakdown">${breakdownText}</div>
                </div>
            `;
            
            quoteChannelsContainer.appendChild(cardEl);
        });
    }
});
