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

// Credentials configuration
const CLIENT_CODE = 'CN3949603';
const API_SECRET = '3ihcklF2g/g1NdP1ZhzhXw==';

// Generate Token
const tokenSource = `${CLIENT_CODE}&${API_SECRET}`;
const authToken = Buffer.from(tokenSource).toString('base64');

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
        const response = await fetch(apiUrl, {
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
        res.status(500).json({
            success: false,
            message: '后端服务查询失败，请稍后再试',
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
        const response = await fetch(apiUrl, {
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
        res.status(500).json({
            success: false,
            message: '后端服务查询运费失败，请稍后再试',
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
        const response = await fetch(apiUrl, {
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
            data.Items = data.Items.map(item => {
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
        }
        res.json(data);
    } catch (error) {
        console.error('Error fetching price trial from YunExpress:', error);
        res.status(500).json({
            success: false,
            message: '后端服务估算运费失败，请稍后再试',
            error: error.message
        });
    }
});

// Proxy API Route for getting countries sorted (European and American countries first)
app.get('/api/countries', async (req, res) => {
    const apiUrl = 'http://oms.api.yunexpress.com/api/Common/GetCountry';

    try {
        const response = await fetch(apiUrl, {
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
        res.status(500).json({
            success: false,
            message: '后端服务获取国家列表失败，请稍后再试',
            error: error.message
        });
    }
});
// Proxy API Route for updating configuration (Bypasses GFW network blocks)
app.post('/api/github-sync', async (req, res) => {
    const { token, profit_margin, packaging_fee } = req.body;
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
    const configString = JSON.stringify(configObj, null, 2);
    const base64Content = Buffer.from(configString).toString('base64');
    const paths = ['public/config.json', 'config.json'];

    try {
        for (const path of paths) {
            const url = `https://api.github.com/repos/${repo}/contents/${path}`;
            
            // 1. Get SHA of existing file
            let sha = '';
            const getRes = await fetch(url, {
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
                message: `Update ${path} from admin panel via Vercel Proxy (V1.5.50)`,
                content: base64Content
            };
            if (sha) {
                putBody.sha = sha;
            }

            const putRes = await fetch(url, {
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
        res.status(500).json({ success: false, message: error.message });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

module.exports = app;
