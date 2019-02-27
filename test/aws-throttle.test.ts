import test from "ava";
import { faast, info } from "../index";
import * as funcs from "./fixtures/functions";

test("remote aws throttling to no concurrency", async t => {
    const cloudFunc = await faast("aws", funcs, "./fixtures/functions", {
        mode: "https",
        memorySize: 1024,
        concurrency: 1
    });
    try {
        const N = 10;
        const promises = [cloudFunc.functions.timer(1000)];
        for (let i = 1; i < N; i++) {
            promises.push(cloudFunc.functions.timer(1000));
        }
        const results = await Promise.all(promises);
        results.sort(({ start: a }, { start: b }) => a - b);
        info(results);
        let lastEnd = 0;
        // Executions should not overlap in their timestamps.
        for (const timing of results) {
            t.true(timing.start > lastEnd);
            lastEnd = timing.end;
        }
    } finally {
        await cloudFunc.cleanup();
    }
});
