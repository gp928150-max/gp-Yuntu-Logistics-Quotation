async function runBatchedRequests(url, count, batchSize) {
    let completed = 0;
    while (completed < count) {
        let currentBatch = Math.min(batchSize, count - completed);
        let promises = [];
        for (let i = 0; i < currentBatch; i++) {
            promises.push(fetch(url).catch(e => console.error("Request failed:", e.message)));
        }
        await Promise.all(promises);
        completed += currentBatch;
        console.log(`Progress: ${completed}/${count} completed for ${url}`);
    }
}

async function start() {
    console.log("Starting stats injection...");
    const viewsUrl = "https://gp-yuntu-logistics-quotation.vercel.app/api/stats?track=view";
    const queriesUrl = "https://gp-yuntu-logistics-quotation.vercel.app/api/stats?track=query";

    console.log("Injecting 1000 views...");
    await runBatchedRequests(viewsUrl, 1000, 100);

    console.log("\nInjecting 3000 queries...");
    await runBatchedRequests(queriesUrl, 3000, 100);

    console.log("\nChecking final stats...");
    let res = await fetch("https://gp-yuntu-logistics-quotation.vercel.app/api/stats");
    let finalData = await res.json();
    console.log("Final Stats:", finalData);
}

start().catch(console.error);
