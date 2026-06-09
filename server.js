const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all requests (useful if embedded from another domain like Webflow)
app.use(cors());

// Enable JSON body parsing for POST/PUT requests
app.use(express.json());

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Credentials configuration (Read from environment variables)
const CLIENT_CODE = process.env.YUNTU_CLIENT_CODE;
const API_SECRET = process.env.YUNTU_API_SECRET;

// Warn if environment variables are not set (for local development or pending Vercel configuration)
if (!CLIENT_CODE || !API_SECRET) {
    console.warn('WARNING: YUNTU_CLIENT_CODE or YUNTU_API_SECRET environment variable is missing.');
}

// Generate Token
const tokenSource = `${CLIENT_CODE || ''}&${API_SECRET || ''}`;
const authToken = Buffer.from(tokenSource).toString('base64');

// Fetch helper with timeout using AbortController
async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(id);
        return response;
    } catch (error) {
        clearTimeout(id);
        throw error;
    }
}

// Proxy API Route
app.get('/api/track', async (req, res) => {
    const orderNumber = req.query.order;
    if (!orderNumber) {
        return res.status(400).json({
            success: false,
            message: '单号不能为空'
        });
    }

    const apiUrl = `http://oms.api.yunexpress.com/api/Tracking/GetTrackAllInfo?OrderNumber=${encodeURIComponent(orderNumber)}`;

    try {
        const response = await fetchWithTimeout(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching from YunExpress:', error);
        let status = 500;
        let msg = '后端服务查询失败，请稍后再试';
        if (error.name === 'AbortError') {
            status = 504;
            msg = '请求云途服务超时，后端未能与云途服务器建立连接，请稍后再试';
        }
        res.status(status).json({
            success: false,
            message: msg,
            error: error.message
        });
    }
});

// Proxy API Route for Shipping Fee Detail
app.get('/api/shipping-fee', async (req, res) => {
    const waybillNumber = req.query.waybill;
    if (!waybillNumber) {
        return res.status(400).json({
            success: false,
            message: '运单号不能为空'
        });
    }

    const apiUrl = `http://oms.api.yunexpress.com/api/Freight/GetShippingFeeDetail?wayBillNumber=${encodeURIComponent(waybillNumber)}`;

    try {
        const response = await fetchWithTimeout(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching shipping fee from YunExpress:', error);
        let status = 500;
        let msg = '后端服务查询运费失败，请稍后再试';
        if (error.name === 'AbortError') {
            status = 504;
            msg = '请求云途服务超时，后端未能与云途服务器建立连接，请稍后再试';
        }
        res.status(status).json({
            success: false,
            message: msg,
            error: error.message
        });
    }
});

// Proxy API Route for Quotation Price Trial
app.get('/api/quotation', async (req, res) => {
    const { CountryCode, Weight, Length, Width, Height, PackageType, PostCode } = req.query;
    
    if (!CountryCode || !Weight) {
        return res.status(400).json({
            success: false,
            message: '国家简码和重量不能为空'
        });
    }

    // Build URL with optional parameters
    const params = new URLSearchParams({
        CountryCode,
        Weight,
        Length: Length || '1',
        Width: Width || '1',
        Height: Height || '1',
        PackageType: PackageType || '1'
    });
    
    if (PostCode) {
        params.append('PostCode', PostCode);
    }

    const apiUrl = `http://oms.api.yunexpress.com/api/Freight/GetPriceTrial?${params.toString()}`;

    try {
        const response = await fetchWithTimeout(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Error fetching price trial from YunExpress:', error);
        let status = 500;
        let msg = '后端服务估算运费失败，请稍后再试';
        if (error.name === 'AbortError') {
            status = 504;
            msg = '请求云途服务超时，后端未能与云途服务器建立连接，请稍后再试';
        }
        res.status(status).json({
            success: false,
            message: msg,
            error: error.message
        });
    }
});

// Proxy API Route for getting countries sorted (European and American countries first)
app.get('/api/countries', async (req, res) => {
    const apiUrl = 'http://oms.api.yunexpress.com/api/Common/GetCountry';

    try {
        const response = await fetchWithTimeout(apiUrl, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': `Basic ${authToken}`
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.Code === '0000' && data.Items) {
            const countries = data.Items;
            
            // Priority list for European & American countries
            const priorityCountries = ['US', 'GB', 'DE', 'FR', 'IT', 'ES', 'CA', 'AU', 'NL', 'BE', 'PL'];
            
            // Sort countries
            countries.sort((a, b) => {
                const indexA = priorityCountries.indexOf(a.CountryCode);
                const indexB = priorityCountries.indexOf(b.CountryCode);
                
                // If both are in the priority list, sort according to priority list order
                if (indexA !== -1 && indexB !== -1) {
                    return indexA - indexB;
                }
                // If only a is in priority, it goes first
                if (indexA !== -1) return -1;
                // If only b is in priority, it goes first
                if (indexB !== -1) return 1;
                
                // Otherwise sort alphabetically by CountryCode
                return a.CountryCode.localeCompare(b.CountryCode);
            });
            
            res.json({ success: true, items: countries });
        } else {
            res.status(500).json({ success: false, message: data.Message || '获取国家列表失败' });
        }
    } catch (error) {
        console.error('Error fetching countries:', error);
        let status = 500;
        let msg = '后端服务获取国家列表失败，请稍后再试';
        if (error.name === 'AbortError') {
            status = 504;
            msg = '请求云途服务超时，后端未能与云途服务器建立连接，请稍后再试';
        }
        res.status(status).json({
            success: false,
            message: msg,
            error: error.message
        });
    }
});

// Proxy API Route for updating configuration (Bypasses GFW network blocks)
app.post('/api/github-sync', async (req, res) => {
    const { token, profit_margin, packaging_fee, backend_url } = req.body;
    if (!token) {
        return res.status(400).json({ success: false, message: '令牌 (Token) 不能为空' });
    }
    if (profit_margin === undefined || packaging_fee === undefined) {
        return res.status(400).json({ success: false, message: '利润率或打包费参数缺失' });
    }

    const repo = 'gp928150-max/gp-Yuntu-Logistics-Quotation';
    const configObj = {
        profit_margin: parseFloat(profit_margin),
        packaging_fee: parseFloat(packaging_fee)
    };
    if (backend_url !== undefined) {
        configObj.backend_url = String(backend_url).trim();
    }
    const configString = JSON.stringify(configObj, null, 2);
    const base64Content = Buffer.from(configString).toString('base64');
    const paths = ['config.json'];

    try {
        for (const path of paths) {
            const url = `https://api.github.com/repos/${repo}/contents/${path}`;
            
            // 1. Get SHA of existing file
            let sha = '';
            const getRes = await fetchWithTimeout(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Cache-Control': 'no-cache',
                    'User-Agent': 'gp-Yuntu-Logistics-Quotation'
                }
            });

            if (getRes.ok) {
                const fileData = await getRes.json();
                sha = fileData.sha;
            } else if (getRes.status !== 404) {
                const errText = await getRes.text();
                throw new Error(`获取 ${path} 的 SHA 失败 (HTTP ${getRes.status}): ${errText}`);
            }

            // 2. Put updated config
            const putBody = {
                message: `Update ${path} from admin panel via Vercel Proxy (V1.7.4)`,
                content: base64Content
            };
            if (sha) {
                putBody.sha = sha;
            }

            const putRes = await fetchWithTimeout(url, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/vnd.github.v3+json',
                    'User-Agent': 'gp-Yuntu-Logistics-Quotation'
                },
                body: JSON.stringify(putBody)
            });

            if (!putRes.ok) {
                const errData = await putRes.json();
                throw new Error(`更新 ${path} 失败: ${errData.message || `HTTP ${putRes.status}`}`);
            }
        }

        res.json({ success: true, message: '配置已同步至 GitHub 云端！' });
    } catch (error) {
        console.error('Error in github-sync proxy:', error);
        let msg = error.message;
        if (error.name === 'AbortError') {
            msg = '同步配置至 GitHub 超时，请检查您的网络连接或稍后再试。';
        }
        res.status(500).json({ success: false, message: msg });
    }
});

// Local in-memory fallback for local development
let localStats = {
    views: 0,
    queries: 0
};

// Helper function to interact with Vercel KV REST API
async function executeKVCommand(commandArray) {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

    if (!url || !token) {
        // Fallback to local in-memory store
        const cmd = commandArray[0].toUpperCase();
        if (cmd === 'INCR') {
            const key = commandArray[1];
            if (key === 'gp_views') localStats.views++;
            if (key === 'gp_queries') localStats.queries++;
            return key === 'gp_views' ? localStats.views : localStats.queries;
        } else if (cmd === 'MGET') {
            return [String(localStats.views), String(localStats.queries)];
        }
        return null;
    }

    try {
        const response = await fetchWithTimeout(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(commandArray)
        }, 5000);

        if (!response.ok) {
            throw new Error(`KV API error: ${response.status} ${await response.text()}`);
        }

        const data = await response.json();
        return data.result;
    } catch (err) {
        console.error('Vercel KV execution error, falling back to local:', err);
        const cmd = commandArray[0].toUpperCase();
        if (cmd === 'INCR') {
            const key = commandArray[1];
            if (key === 'gp_views') localStats.views++;
            if (key === 'gp_queries') localStats.queries++;
            return key === 'gp_views' ? localStats.views : localStats.queries;
        } else if (cmd === 'MGET') {
            return [String(localStats.views), String(localStats.queries)];
        }
        return null;
    }
}

// Endpoint to track and retrieve stats
app.get('/api/stats', async (req, res) => {
    const track = req.query.track;

    try {
        if (track === 'view') {
            await executeKVCommand(['INCR', 'gp_views']);
        } else if (track === 'query') {
            await executeKVCommand(['INCR', 'gp_queries']);
        }

        // Retrieve both stats
        const values = await executeKVCommand(['MGET', 'gp_views', 'gp_queries']);
        const viewsVal = values && values[0] ? parseInt(values[0]) : 0;
        const queriesVal = values && values[1] ? parseInt(values[1]) : 0;

        res.json({
            success: true,
            views: viewsVal,
            queries: queriesVal
        });
    } catch (error) {
        console.error('Stats endpoint error:', error);
        res.status(500).json({
            success: false,
            message: '获取或更新统计数据失败',
            error: error.message
        });
    }
});

// GET configuration endpoint
app.get('/api/config', async (req, res) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    let config = {
        profit_margin: 1.13,
        packaging_fee: 2.0,
        backend_url: ''
    };

    // 1. Try loading from Vercel KV first
    try {
        const kvConfigStr = await executeKVCommand(['GET', 'gp_config']);
        if (kvConfigStr) {
            const kvConfig = typeof kvConfigStr === 'string' ? JSON.parse(kvConfigStr) : kvConfigStr;
            if (kvConfig && typeof kvConfig === 'object') {
                if (kvConfig.profit_margin !== undefined) config.profit_margin = parseFloat(kvConfig.profit_margin);
                if (kvConfig.packaging_fee !== undefined) config.packaging_fee = parseFloat(kvConfig.packaging_fee);
                if (kvConfig.backend_url !== undefined) config.backend_url = String(kvConfig.backend_url);
                return res.json(config);
            }
        }
    } catch (kvErr) {
        console.error('Failed to fetch config from Vercel KV:', kvErr);
    }

    // 2. Fallback: local config.json or environment variables
    let localConfig = {};
    try {
        const fs = require('fs');
        const configPath = path.join(__dirname, 'config.json');
        if (fs.existsSync(configPath)) {
            localConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }
    } catch (err) {
        console.error('Failed to read config.json:', err);
    }

    config.profit_margin = process.env.PROFIT_MARGIN ? parseFloat(process.env.PROFIT_MARGIN) : (localConfig.profit_margin !== undefined ? localConfig.profit_margin : 1.13);
    config.packaging_fee = process.env.PACKAGING_FEE ? parseFloat(process.env.PACKAGING_FEE) : (localConfig.packaging_fee !== undefined ? localConfig.packaging_fee : 2.0);
    config.backend_url = process.env.BACKEND_URL || localConfig.backend_url || '';

    res.json(config);
});

// POST configuration endpoint (Updates both Vercel KV and local root config.json if possible)
app.post('/api/config', async (req, res) => {
    const { hashedPwd, profit_margin, packaging_fee, backend_url } = req.body;
    
    // Verify authentication
    const envHash = process.env.ADMIN_PASSWORD_HASH || '8b940be7fb78aaa6b6567dd7a3987996947460df1c668e698eb92ca77e425349';
    if (hashedPwd !== envHash) {
        return res.status(401).json({ success: false, message: '密码错误，认证失败！' });
    }

    if (profit_margin === undefined || packaging_fee === undefined) {
        return res.status(400).json({ success: false, message: '利润率或打包费参数缺失' });
    }

    const configObj = {
        profit_margin: parseFloat(profit_margin),
        packaging_fee: parseFloat(packaging_fee),
        backend_url: backend_url !== undefined ? String(backend_url).trim() : ''
    };

    let kvSaved = false;
    try {
        const result = await executeKVCommand(['SET', 'gp_config', JSON.stringify(configObj)]);
        if (result) {
            kvSaved = true;
        }
    } catch (kvErr) {
        console.error('Failed to save config to Vercel KV:', kvErr);
    }

    let fileSaved = false;
    try {
        const fs = require('fs');
        const configPath = path.join(__dirname, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(configObj, null, 2), 'utf8');
        fileSaved = true;
    } catch (fsErr) {
        console.warn('Failed to save config to local file config.json:', fsErr);
    }

    if (kvSaved || fileSaved) {
        res.json({
            success: true,
            message: '配置已成功保存！',
            kvSaved,
            fileSaved
        });
    } else {
        res.status(500).json({
            success: false,
            message: '保存配置失败（无法写入 KV 数据库或本地文件）'
        });
    }
});


// Admin authentication endpoint
app.post('/api/admin-auth', async (req, res) => {
    const { hashedPwd } = req.body;
    // Get hash from environment variable, fallback to original default hash if not set
    const envHash = process.env.ADMIN_PASSWORD_HASH || '8b940be7fb78aaa6b6567dd7a3987996947460df1c668e698eb92ca77e425349';
    if (hashedPwd === envHash) {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: '密码错误，认证失败！' });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

module.exports = app;
