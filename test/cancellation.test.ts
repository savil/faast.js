import test from "ava";
import { inspect } from "util";
import * as faast from "../src/faast";
import { faastify } from "../src/faast";
import { CommonOptions } from "../src/provider";
import { sleep } from "../src/shared";
import {
    clearLeakDetector,
    detectAsyncLeaks,
    startAsyncTracing,
    stopAsyncTracing
} from "../src/trace";
import { providers, configs } from "./configurations";
import * as funcs from "./functions";

function testCancellation(provider: faast.Provider, options?: CommonOptions) {
    const opts = inspect(options, { breakLength: Infinity });
    test.serial(
        `${provider} ${opts} cleanup waits for all child processes to exit`,
        async t => {
            await sleep(0); // wait until jest sets its timeout so it doesn't get picked up by async_hooks.
            startAsyncTracing();
            const cloudFunc = await faastify(provider, funcs, "./functions", {
                ...options,
                childProcess: true,
                gc: false
            });
            cloudFunc.functions.spin(10000).catch(_ => {});
            await sleep(500); // wait until the request actually starts
            await cloudFunc.cleanup();
            stopAsyncTracing();
            await sleep(500);
            const leaks = detectAsyncLeaks();
            t.true(leaks.length === 0);
            clearLeakDetector();
        }
    );
}

for (const provider of providers) {
    for (const config of configs) {
        testCancellation(provider, config);
    }
}