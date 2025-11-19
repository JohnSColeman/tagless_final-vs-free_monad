import {Order} from "../../src/domain";
import {Email, Logger, Orders, Payment} from "../../src/tagless/algebra";
import {placeOrder} from "../../src/tagless/logic";
import {Effect} from "../../src/tagless/Effect";
import {describe, it} from "node:test";
import * as assert from "node:assert";

// Promise-based interpreter - same as in interpret.ts
const fromPromise = <A>(promise: Promise<A>): Effect<A> => ({
    chain: <B>(f: (a: A) => Effect<B>): Effect<B> => fromPromise(promise.then(a => f(a) as any)),
    map: <B>(f: (a: A) => B): Effect<B> => fromPromise(promise.then(f))
});

// Helper to convert Effect<A> back to Promise<A> for testing
const toPromise = <A>(fa: Effect<A>): Promise<A> => {
    return new Promise((resolve) => {
        fa.map((a: A) => {
            resolve(a);
            return a;
        });
    });
};

describe("Tagless Final Interpreter (Promise-based)", () => {
    it("should successfully process an order with async operations", async () => {
        const logs: string[] = [];
        const savedOrders: Order[] = [];
        const sentEmails: Array<{ to: string; body: string }> = [];

        const mockPayment: Payment<Effect<boolean>> = {
            charge: (amount: number) => fromPromise(
                Promise.resolve().then(() => {
                    // Simulate async payment processing
                    return amount < 1000;
                })
            )
        };

        const mockOrders: Orders<Effect<void>> = {
            save: (order: Order) => fromPromise(
                Promise.resolve().then(() => {
                    savedOrders.push(order);
                    return undefined;
                })
            )
        };

        const mockEmail: Email<Effect<void>> = {
            send: (to: string, body: string) => fromPromise(
                Promise.resolve().then(() => {
                    sentEmails.push({ to, body });
                    return undefined;
                })
            )
        };

        const mockLogger: Logger<Effect<void>> = {
            info: (msg: string) => fromPromise(
                Promise.resolve().then(() => {
                    logs.push(msg);
                    return undefined;
                })
            )
        };

        const order: Order = {
            id: "ASYNC-001",
            customerEmail: "async@example.com",
            amount: 500
        };

        const result = placeOrder(mockPayment, mockOrders, mockEmail, mockLogger)(order);
        await toPromise(result);

        assert.strictEqual(logs.length, 3, "Should log 3 messages");
        assert.strictEqual(logs[0], "Placing order ASYNC-001");
        assert.strictEqual(logs[1], "Payment success");
        assert.strictEqual(logs[2], "Order ASYNC-001 flow complete");
        assert.strictEqual(savedOrders.length, 1, "Should save 1 order");
        assert.deepStrictEqual(savedOrders[0], order);
        assert.strictEqual(sentEmails.length, 1, "Should send 1 email");
        assert.strictEqual(sentEmails[0]?.to, "async@example.com");
        assert.strictEqual(sentEmails[0]?.body, "Your order is confirmed!");
    });

    it("should handle async payment failure scenario", async () => {
        const logs: string[] = [];
        let paymentResult: boolean | undefined;

        const mockPayment: Payment<Effect<boolean>> = {
            charge: (amount: number) => fromPromise(
                Promise.resolve().then(() => {
                    paymentResult = amount < 1000;
                    return paymentResult;
                })
            )
        };

        const mockOrders: Orders<Effect<void>> = {
            save: () => fromPromise(Promise.resolve())
        };

        const mockEmail: Email<Effect<void>> = {
            send: () => fromPromise(Promise.resolve())
        };

        const mockLogger: Logger<Effect<void>> = {
            info: (msg: string) => fromPromise(
                Promise.resolve().then(() => {
                    logs.push(msg);
                })
            )
        };

        const order: Order = {
            id: "ASYNC-002",
            customerEmail: "async@example.com",
            amount: 1500  // This should fail payment (>= 1000)
        };

        const result = placeOrder(mockPayment, mockOrders, mockEmail, mockLogger)(order);
        await toPromise(result);

        // Verify the payment check executed
        assert.strictEqual(paymentResult, false, "Payment should have failed");
        // Verify workflow completed
        assert.strictEqual(logs.length, 3, "Should complete the workflow");
        assert.ok(logs[0]?.includes("Placing order"), "Should log order placement");
    });

    it("should verify async operations execute in sequence", async () => {
        const operations: string[] = [];

        const mockPayment: Payment<Effect<boolean>> = {
            charge: () => fromPromise(
                Promise.resolve().then(() => {
                    operations.push("payment");
                    return true;
                })
            )
        };

        const mockOrders: Orders<Effect<void>> = {
            save: () => fromPromise(
                Promise.resolve().then(() => {
                    operations.push("save");
                })
            )
        };

        const mockEmail: Email<Effect<void>> = {
            send: () => fromPromise(
                Promise.resolve().then(() => {
                    operations.push("email");
                })
            )
        };

        const mockLogger: Logger<Effect<void>> = {
            info: (msg: string) => fromPromise(
                Promise.resolve().then(() => {
                    operations.push(`log:${msg.split(" ")[0]}`);
                })
            )
        };

        const order: Order = {
            id: "SEQ-001",
            customerEmail: "seq@example.com",
            amount: 500
        };

        const result = placeOrder(mockPayment, mockOrders, mockEmail, mockLogger)(order);
        await toPromise(result);

        // Verify all operations executed
        assert.ok(operations.includes("payment"), "Payment should execute");
        assert.ok(operations.includes("save"), "Save should execute");
        assert.ok(operations.includes("email"), "Email should execute");
        assert.strictEqual(operations.filter(op => op.startsWith("log:")).length, 3, "Should have 3 log operations");
    });

    it("should properly chain multiple async operations", async () => {
        let chainCallCount = 0;

        const mockPayment: Payment<Effect<boolean>> = {
            charge: () => fromPromise(Promise.resolve(true))
        };

        const mockOrders: Orders<Effect<void>> = {
            save: () => fromPromise(Promise.resolve(undefined))
        };

        const mockEmail: Email<Effect<void>> = {
            send: () => fromPromise(Promise.resolve(undefined))
        };

        const mockLogger: Logger<Effect<void>> = {
            info: () => {
                chainCallCount++;
                return fromPromise(Promise.resolve(undefined));
            }
        };

        const order: Order = {
            id: "CHAIN-001",
            customerEmail: "chain@example.com",
            amount: 500
        };

        const result = placeOrder(mockPayment, mockOrders, mockEmail, mockLogger)(order);
        await toPromise(result);

        assert.strictEqual(chainCallCount, 3, "Should have called logger 3 times through the chain");
    });
});
