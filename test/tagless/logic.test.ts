import {Order} from "../../src/domain";
import {Email, Logger, Orders, Payment} from "../../src/tagless/algebra";
import {placeOrder} from "../../src/tagless/logic";
import {Effect} from "../../src/tagless/Effect";
import {describe, it} from "node:test";
import * as assert from "node:assert";

// Test helper to create a simple Effect implementation
const testEffect = <A>(value: A): Effect<A> => ({
    chain: <B>(f: (a: A) => Effect<B>): Effect<B> => f(value),
    map: <B>(f: (a: A) => B): Effect<B> => testEffect(f(value))
});

describe("Tagless Final placeOrder", () => {
    it("should successfully process an order when payment succeeds", () => {
        const logs: string[] = [];
        const savedOrders: Order[] = [];
        const sentEmails: Array<{ to: string; body: string }> = [];

        const mockPayment: Payment<Effect<boolean>> = {
            charge: (amount: number) => {
                return testEffect(amount < 1000);
            }
        };

        const mockOrders: Orders<Effect<void>> = {
            save: (order: Order) => {
                savedOrders.push(order);
                return testEffect(undefined);
            }
        };

        const mockEmail: Email<Effect<void>> = {
            send: (to: string, body: string) => {
                sentEmails.push({ to, body });
                return testEffect(undefined);
            }
        };

        const mockLogger: Logger<Effect<void>> = {
            info: (msg: string) => {
                logs.push(msg);
                return testEffect(undefined);
            }
        };

        const order: Order = {
            id: "TEST-001",
            customerEmail: "test@example.com",
            amount: 500
        };

        const result = placeOrder(mockPayment, mockOrders, mockEmail, mockLogger)(order);
        // Execute the chain by calling map on the result
        result.map(() => undefined);

        assert.strictEqual(logs.length, 3, "Should log 3 messages");
        assert.strictEqual(logs[0], "Placing order TEST-001");
        assert.strictEqual(logs[1], "Payment success");
        assert.strictEqual(logs[2], "Order TEST-001 flow complete");
        assert.strictEqual(savedOrders.length, 1, "Should save 1 order");
        assert.deepStrictEqual(savedOrders[0], order);
        assert.strictEqual(sentEmails.length, 1, "Should send 1 email");
        assert.strictEqual(sentEmails[0]?.to, "test@example.com");
        assert.strictEqual(sentEmails[0]?.body, "Your order is confirmed!");
    });

    it("should not save order when payment fails", () => {
        const logs: string[] = [];
        const savedOrders: Order[] = [];
        const sentEmails: Array<{ to: string; body: string }> = [];

        const mockPayment: Payment<Effect<boolean>> = {
            charge: (amount: number) => {
                return testEffect(amount < 1000); // Will return false for amounts >= 1000
            }
        };

        const mockOrders: Orders<Effect<void>> = {
            save: (order: Order) => {
                savedOrders.push(order);
                return testEffect(undefined);
            }
        };

        const mockEmail: Email<Effect<void>> = {
            send: (to: string, body: string) => {
                sentEmails.push({ to, body });
                return testEffect(undefined);
            }
        };

        const mockLogger: Logger<Effect<void>> = {
            info: (msg: string) => {
                logs.push(msg);
                return testEffect(undefined);
            }
        };

        const order: Order = {
            id: "TEST-002",
            customerEmail: "test@example.com",
            amount: 1500 // Amount over 1000 will fail payment
        };

        const result = placeOrder(mockPayment, mockOrders, mockEmail, mockLogger)(order);
        // Execute the chain by calling map on the result
        result.map(() => undefined);

        assert.strictEqual(logs.length, 3, "Should log 3 messages");
        assert.strictEqual(logs[0], "Placing order TEST-002");
        assert.strictEqual(logs[1], "Payment failed");
        assert.strictEqual(logs[2], "Order TEST-002 flow complete");
        assert.strictEqual(savedOrders.length, 0, "Should not save any orders");
        assert.strictEqual(sentEmails.length, 1, "Should still send email");
        assert.strictEqual(sentEmails[0]?.to, "test@example.com");
    });

    it("should handle order with exact boundary amount", () => {
        const logs: string[] = [];
        const savedOrders: Order[] = [];

        const mockPayment: Payment<Effect<boolean>> = {
            charge: (amount: number) => {
                return testEffect(amount < 1000);
            }
        };

        const mockOrders: Orders<Effect<void>> = {
            save: (order: Order) => {
                savedOrders.push(order);
                return testEffect(undefined);
            }
        };

        const mockEmail: Email<Effect<void>> = {
            send: () => testEffect(undefined)
        };

        const mockLogger: Logger<Effect<void>> = {
            info: (msg: string) => {
                logs.push(msg);
                return testEffect(undefined);
            }
        };

        const order: Order = {
            id: "TEST-003",
            customerEmail: "test@example.com",
            amount: 1000 // Exact boundary - should fail (< 1000)
        };

        const result = placeOrder(mockPayment, mockOrders, mockEmail, mockLogger)(order);
        // Execute the chain by calling map on the result
        result.map(() => undefined);

        assert.strictEqual(logs.length, 3, "Should log 3 messages");
        assert.strictEqual(logs[1], "Payment failed", "Payment at 1000 should fail");
        assert.strictEqual(savedOrders.length, 0, "Should not save order at boundary");
    });
});
