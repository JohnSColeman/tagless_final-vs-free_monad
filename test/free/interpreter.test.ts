import {Order} from "../../src/domain";
import {placeOrder} from "../../src/free/logic";
import {describe, it} from "node:test";
import * as assert from "node:assert";

// Test interpreter that captures effects instead of performing them
interface TestEffects {
    logs: string[];
    savedOrders: Order[];
    sentEmails: Array<{ to: string; body: string }>;
    chargedAmounts: number[];
}

const createTestInterpreter = (effects: TestEffects, paymentThreshold: number = 1000) => {
    const runTest = <A>(fa: any): Promise<A> => {
        if (fa._tag === "Pure") {
            return Promise.resolve(fa.value);
        }

        const op = fa.op;

        switch (op._tag) {
            case "Charge":
                effects.chargedAmounts.push(op.amount);
                return Promise.resolve(op.amount < paymentThreshold)
                    .then(res => runTest(op.next(res)));

            case "Save":
                effects.savedOrders.push(op.order);
                return Promise.resolve()
                    .then(() => runTest(op.next(undefined)));

            case "Send":
                effects.sentEmails.push({to: op.to, body: op.body});
                return Promise.resolve()
                    .then(() => runTest(op.next(undefined)));

            case "Log":
                effects.logs.push(op.msg);
                return Promise.resolve()
                    .then(() => runTest(op.next(undefined)));

            default:
                throw new Error(`Unknown operation: ${(op as any).tag}`);
        }
    };

    return runTest;
};

describe("Free Monad Interpreter", () => {
    it("should successfully process an order with all effects captured", async () => {
        const effects: TestEffects = {
            logs: [],
            savedOrders: [],
            sentEmails: [],
            chargedAmounts: []
        };

        const order: Order = {
            id: "FREE-001",
            customerEmail: "free@example.com",
            amount: 500
        };

        const program = placeOrder(order);
        const runTest = createTestInterpreter(effects);

        await runTest(program);

        // Verify logs
        assert.strictEqual(effects.logs.length, 3, "Should log 3 messages");
        assert.strictEqual(effects.logs[0], "Placing order FREE-001");
        assert.strictEqual(effects.logs[1], "Payment success");
        assert.strictEqual(effects.logs[2], "Order FREE-001 flow complete");

        // Verify payment
        assert.strictEqual(effects.chargedAmounts.length, 1, "Should charge once");
        assert.strictEqual(effects.chargedAmounts[0], 500);

        // Verify order saved
        assert.strictEqual(effects.savedOrders.length, 1, "Should save 1 order");
        assert.deepStrictEqual(effects.savedOrders[0], order);

        // Verify email sent
        assert.strictEqual(effects.sentEmails.length, 1, "Should send 1 email");
        assert.strictEqual(effects.sentEmails[0]?.to, "free@example.com");
        assert.strictEqual(effects.sentEmails[0]?.body, "Your order is confirmed!");
    });

    it("should handle payment failure scenario", async () => {
        const effects: TestEffects = {
            logs: [],
            savedOrders: [],
            sentEmails: [],
            chargedAmounts: []
        };

        const order: Order = {
            id: "FREE-002",
            customerEmail: "free@example.com",
            amount: 1500  // This should fail payment (>= 1000)
        };

        const program = placeOrder(order);
        const runTest = createTestInterpreter(effects);

        await runTest(program);

        // Verify logs show payment failure
        assert.strictEqual(effects.logs.length, 3, "Should log 3 messages");
        assert.strictEqual(effects.logs[0], "Placing order FREE-002");
        assert.strictEqual(effects.logs[1], "Payment failed");
        assert.strictEqual(effects.logs[2], "Order FREE-002 flow complete");

        // Verify payment was attempted
        assert.strictEqual(effects.chargedAmounts.length, 1, "Should charge once");
        assert.strictEqual(effects.chargedAmounts[0], 1500);

        // Verify order was NOT saved (payment failed)
        assert.strictEqual(effects.savedOrders.length, 0, "Should not save order when payment fails");

        // Verify email was still sent
        assert.strictEqual(effects.sentEmails.length, 1, "Should send 1 email");
    });

    it("should verify operations execute in the correct sequence", async () => {
        const effects: TestEffects = {
            logs: [],
            savedOrders: [],
            sentEmails: [],
            chargedAmounts: []
        };

        const executionOrder: string[] = [];

        const runWithTracking = <A>(fa: any): Promise<A> => {
            if (fa._tag === "Pure") {
                return Promise.resolve(fa.value);
            }

            const op = fa.op;

            switch (op._tag) {
                case "Charge":
                    executionOrder.push("charge");
                    effects.chargedAmounts.push(op.amount);
                    return Promise.resolve(op.amount < 1000)
                        .then(res => runWithTracking(op.next(res)));

                case "Save":
                    executionOrder.push("save");
                    effects.savedOrders.push(op.order);
                    return Promise.resolve()
                        .then(() => runWithTracking(op.next(undefined)));

                case "Send":
                    executionOrder.push("send");
                    effects.sentEmails.push({to: op.to, body: op.body});
                    return Promise.resolve()
                        .then(() => runWithTracking(op.next(undefined)));

                case "Log":
                    executionOrder.push(`log:${op.msg.split(" ")[0]}`);
                    effects.logs.push(op.msg);
                    return Promise.resolve()
                        .then(() => runWithTracking(op.next(undefined)));

                default:
                    throw new Error(`Unknown operation: ${(op as any).tag}`);
            }
        };

        const order: Order = {
            id: "SEQ-001",
            customerEmail: "seq@example.com",
            amount: 500
        };

        const program = placeOrder(order);
        await runWithTracking(program);

        // Verify execution order
        assert.deepStrictEqual(executionOrder, [
            "log:Placing",
            "charge",
            "log:Payment",
            "save",
            "send",
            "log:Order"
        ], "Operations should execute in the correct sequence");
    });

    it("should handle different payment thresholds", async () => {
        const effects: TestEffects = {
            logs: [],
            savedOrders: [],
            sentEmails: [],
            chargedAmounts: []
        };

        const order: Order = {
            id: "THRESHOLD-001",
            customerEmail: "threshold@example.com",
            amount: 750
        };

        // Use a custom threshold of 500 (payment should fail)
        const program = placeOrder(order);
        const runTest = createTestInterpreter(effects, 500);

        await runTest(program);

        // Payment should fail with this threshold
        assert.strictEqual(effects.logs[1], "Payment failed");
        assert.strictEqual(effects.savedOrders.length, 0, "Should not save order");
    });

    it("should build a Free program that can be interpreted multiple times", async () => {
        const order: Order = {
            id: "REUSE-001",
            customerEmail: "reuse@example.com",
            amount: 600
        };

        const program = placeOrder(order);

        // First interpretation
        const effects1: TestEffects = {
            logs: [],
            savedOrders: [],
            sentEmails: [],
            chargedAmounts: []
        };
        const run1 = createTestInterpreter(effects1);
        await run1(program);

        // Second interpretation with different threshold
        const effects2: TestEffects = {
            logs: [],
            savedOrders: [],
            sentEmails: [],
            chargedAmounts: []
        };
        const run2 = createTestInterpreter(effects2, 500);
        await run2(program);

        // Both interpretations should complete
        assert.strictEqual(effects1.logs.length, 3);
        assert.strictEqual(effects2.logs.length, 3);

        // But with different results
        assert.strictEqual(effects1.logs[1], "Payment success");
        assert.strictEqual(effects2.logs[1], "Payment failed");
        assert.strictEqual(effects1.savedOrders.length, 1);
        assert.strictEqual(effects2.savedOrders.length, 0);
    });

    it("should properly chain operations using the Free monad", async () => {
        const effects: TestEffects = {
            logs: [],
            savedOrders: [],
            sentEmails: [],
            chargedAmounts: []
        };

        const order: Order = {
            id: "CHAIN-001",
            customerEmail: "chain@example.com",
            amount: 500
        };

        const program = placeOrder(order);
        const runTest = createTestInterpreter(effects);

        const result = await runTest(program);

        // Result should be void
        assert.strictEqual(result, undefined);

        // All operations should have been performed
        assert.ok(effects.chargedAmounts.length > 0, "Should have charged");
        assert.ok(effects.savedOrders.length > 0, "Should have saved");
        assert.ok(effects.sentEmails.length > 0, "Should have sent email");
        assert.ok(effects.logs.length > 0, "Should have logged");
    });
});
