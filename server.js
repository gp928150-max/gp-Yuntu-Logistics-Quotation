const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS for all requests (useful if embedded from another domain like Webflow)
app.use(cors());

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

// Start Server
app.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});

module.exports = app;
