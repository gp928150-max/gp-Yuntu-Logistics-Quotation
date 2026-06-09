const fs = require('fs');
const vm = require('vm');

function runTest(jsPath) {
    console.log(`\nEvaluating runtime of: ${jsPath}`);
    const jsContent = fs.readFileSync(jsPath, 'utf8');

    // Simple mock elements
    const createMockElement = (id, tag = 'div') => {
        const classList = new Set();
        const attrs = {};
        const listeners = {};
        
        return {
            id,
            tagName: tag.toUpperCase(),
            classList: {
                add: (c) => classList.add(c),
                remove: (c) => classList.delete(c),
                contains: (c) => classList.has(c),
            },
            style: {},
            options: [
                { text: 'General Goods' },
                { text: 'Battery' },
                { text: 'Special Goods' }
            ],
            selectedIndex: 0,
            dataset: {},
            getAttribute: (attr) => attrs[attr] || null,
            setAttribute: (attr, val) => { attrs[attr] = val; },
            addEventListener: (event, cb) => {
                if (!listeners[event]) listeners[event] = [];
                listeners[event].push(cb);
            },
            // For list elements
            querySelector: (sel) => createMockElement('', 'span'),
            querySelectorAll: (sel) => [createMockElement('', 'li'), createMockElement('', 'li')],
            appendChild: (el) => {},
            // Set text/html
            set textContent(val) {},
            get textContent() { return ''; },
            set innerHTML(val) {},
            get innerHTML() { return ''; },
        };
    };

    const listeners = {};
    const mockDocument = {
        addEventListener: (event, cb) => {
            if (!listeners[event]) listeners[event] = [];
            listeners[event].push(cb);
        },
        getElementById: (id) => {
            // Mock specifically for quoteGoodsType to have options
            if (id === 'quote-goods-type') {
                return createMockElement(id, 'select');
            }
            return createMockElement(id);
        },
        querySelectorAll: (sel) => {
            if (sel === '.lang-pill') {
                const p1 = createMockElement('', 'button');
                p1.setAttribute('data-lang', 'zh');
                const p2 = createMockElement('', 'button');
                p2.setAttribute('data-lang', 'en');
                return [p1, p2];
            }
            return [];
        }
    };

    const mockLocalStorage = {
        getItem: (key) => null,
        setItem: (key, val) => {},
        removeItem: (key) => {}
    };

    const mockFetch = (url, options) => {
        return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ rates: { USD: 7.25, EUR: 7.85, HKD: 0.93 } })
        });
    };

    const sandbox = {
        document: mockDocument,
        window: {},
        localStorage: mockLocalStorage,
        fetch: mockFetch,
        console: {
            log: (...args) => console.log(' [LOG]', ...args),
            warn: (...args) => console.warn(' [WARN]', ...args),
            error: (...args) => console.error(' [ERROR]', ...args)
        },
        setTimeout: (cb, ms) => {
            // run immediately or defer
            process.nextTick(cb);
        },
        setInterval: () => {},
        atob: (str) => Buffer.from(str, 'base64').toString('binary'),
        btoa: (str) => Buffer.from(str, 'binary').toString('base64'),
        decodeURIComponent: decodeURIComponent,
        URLSearchParams: URLSearchParams,
        Math: Math,
        parseFloat: parseFloat,
        parseInt: parseInt,
        isNaN: isNaN,
        Object: Object,
        Array: Array,
        Set: Set,
        Promise: Promise
    };

    sandbox.window.document = mockDocument;

    const context = vm.createContext(sandbox);
    try {
        vm.runInContext(jsContent, context);
        console.log("Evaluation complete (no synchronous execution errors outside of listener).");
        
        // Trigger DOMContentLoaded
        if (listeners['DOMContentLoaded']) {
            console.log("Triggering DOMContentLoaded...");
            listeners['DOMContentLoaded'].forEach(cb => cb());
            console.log("✅ DOMContentLoaded callback executed successfully without errors!");
        } else {
            console.log("❌ DOMContentLoaded listener was not added.");
        }
    } catch (err) {
        console.error("❌ Runtime exception thrown:", err);
    }
}

runTest('app.js');
runTest('public/app.js');
