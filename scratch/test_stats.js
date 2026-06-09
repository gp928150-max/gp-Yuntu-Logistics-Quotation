async function test() {
    console.log("Fetching initial stats...");
    let res1 = await fetch("https://gp-yuntu-logistics-quotation.vercel.app/api/stats");
    let data1 = await res1.json();
    console.log("Initial Stats:", data1);

    console.log("\nIncrementing views (track=view)...");
    let res2 = await fetch("https://gp-yuntu-logistics-quotation.vercel.app/api/stats?track=view");
    let data2 = await res2.json();
    console.log("Stats after tracking view:", data2);

    console.log("\nFetching stats again after 1.5 seconds...");
    await new Promise(r => setTimeout(r, 1500));
    let res3 = await fetch("https://gp-yuntu-logistics-quotation.vercel.app/api/stats");
    let data3 = await res3.json();
    console.log("Final Stats:", data3);
}

test().catch(console.error);
