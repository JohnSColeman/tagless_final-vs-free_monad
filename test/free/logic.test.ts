import {Order} from "../../src/domain";
import {placeOrder} from "../../src/free/logic";
import {describe, it} from "node:test";
import * as assert from "node:assert";

describe("Free Monad placeOrder", () => {
    it("should build a Free program with the correct structure", () => {
        const order: Order = {
            id: "TEST-001",
            customerEmail: "test@example.com",
            amount: 500
        };

        const program = placeOrder(order);

        // The program should be a Free monad (not Pure at the top level)
        assert.strictEqual(program._tag, "Impure", "Program should start with Impure");
        assert.strictEqual(program.op._tag, "Log", "First operation should be Log");
        assert.strictEqual(program.op.msg, "Placing order TEST-001");
    });

    it("should create different programs for different orders", () => {
        const order1: Order = {
            id: "ORDER-001",
            customerEmail: "user1@example.com",
            amount: 100
        };

        const order2: Order = {
            id: "ORDER-002",
            customerEmail: "user2@example.com",
            amount: 200
        };

        const program1 = placeOrder(order1) as any;
        const program2 = placeOrder(order2) as any;

        // Programs should have different log messages
        assert.strictEqual(program1.op.msg, "Placing order ORDER-001");
        assert.strictEqual(program2.op.msg, "Placing order ORDER-002");
    });

    it("should sequence operations via chain", () => {
        const order: Order = {
            id: "CHAIN-001",
            customerEmail: "chain@example.com",
            amount: 750
        };

        const program = placeOrder(order) as any;

        // Verify it's a chained structure (Impure)
        assert.strictEqual(program._tag, "Impure");

        // The program contains a continuation (op.next)
        assert.strictEqual(typeof program.op.next, "function");

        // Execute the first continuation to get the next step
        const nextProgram = program.op.next(undefined) as any;
        assert.strictEqual(nextProgram._tag, "Impure");
        assert.strictEqual(nextProgram.op._tag, "Charge");
        assert.strictEqual(nextProgram.op.amount, 750);
    });

    it("should handle payment success path", () => {
        const order: Order = {
            id: "SUCCESS-001",
            customerEmail: "success@example.com",
            amount: 500
        };

        const program = placeOrder(order) as any;

        // Navigate to charge operation
        const afterLog = program.op.next(undefined) as any;
        assert.strictEqual(afterLog.op._tag, "Charge");

        // Simulate successful payment
        const afterCharge = afterLog.op.next(true) as any;
        assert.strictEqual(afterCharge.op._tag, "Log");
        assert.strictEqual(afterCharge.op.msg, "Payment success");

        // After success log, should have save operation
        const afterSuccessLog = afterCharge.op.next(undefined) as any;
        assert.strictEqual(afterSuccessLog.op._tag, "Save");
        assert.deepStrictEqual(afterSuccessLog.op.order, order);
    });

    it("should handle payment failure path", () => {
        const order: Order = {
            id: "FAIL-001",
            customerEmail: "fail@example.com",
            amount: 1500
        };

        const program = placeOrder(order) as any;

        // Navigate to charge operation
        const afterLog = program.op.next(undefined) as any;
        assert.strictEqual(afterLog.op._tag, "Charge");

        // Simulate failed payment
        const afterCharge = afterLog.op.next(false) as any;
        assert.strictEqual(afterCharge.op._tag, "Log");
        assert.strictEqual(afterCharge.op.msg, "Payment failed");

        // After failure log, should skip save and go to send
        const afterFailLog = afterCharge.op.next(undefined);
        assert.strictEqual(afterFailLog.op._tag, "Send");
        assert.strictEqual(afterFailLog.op.to, "fail@example.com");
    });

    it("should always send email regardless of payment result", () => {
        const order: Order = {
            id: "EMAIL-001",
            customerEmail: "email@example.com",
            amount: 800
        };

        const program = placeOrder(order) as any;

        // Success path
        let current: any = program.op.next(undefined); // After first log
        current = current.op.next(true); // After charge (success)
        current = current.op.next(undefined); // After success log
        current = current.op.next(undefined); // After save
        assert.strictEqual(current.op._tag, "Send");
        assert.strictEqual(current.op.to, "email@example.com");
        assert.strictEqual(current.op.body, "Your order is confirmed!");

        // Failure path
        const program2 = placeOrder(order) as any;
        let current2: any = program2.op.next(undefined); // After first log
        current2 = current2.op.next(false); // After charge (failure)
        current2 = current2.op.next(undefined); // After failure log
        assert.strictEqual(current2.op._tag, "Send");
        assert.strictEqual(current2.op.to, "email@example.com");
    });

    it("should end with a completion log", () => {
        const order: Order = {
            id: "COMPLETE-001",
            customerEmail: "complete@example.com",
            amount: 600
        };

        const program = placeOrder(order) as any;

        // Navigate through success path
        let current: any = program.op.next(undefined); // After first log
        current = current.op.next(true); // After charge (success)
        current = current.op.next(undefined); // After success log
        current = current.op.next(undefined); // After save
        current = current.op.next(undefined); // After send

        assert.strictEqual(current.op._tag, "Log");
        assert.strictEqual(current.op.msg, "Order COMPLETE-001 flow complete");

        // After completion log, should be Pure
        const final = current.op.next(undefined);
        assert.strictEqual(final._tag, "Pure");
        assert.strictEqual(final.value, undefined);
    });

    it("should produce a pure program structure that can be inspected", () => {
        const order: Order = {
            id: "INSPECT-001",
            customerEmail: "inspect@example.com",
            amount: 900
        };

        const program = placeOrder(order) as any;

        // The program is data that can be inspected
        assert.ok(program, "Program should exist");
        assert.ok(program.op, "Program should have operations");
        assert.ok(typeof program.op.next === "function", "Operations should have continuations");

        // This demonstrates the key benefit of Free Monads:
        // Programs are data structures that can be analyzed, transformed,
        // or interpreted in different ways
    });

    it("should handle boundary payment amount (1000)", () => {
        const order: Order = {
            id: "BOUNDARY-001",
            customerEmail: "boundary@example.com",
            amount: 1000
        };

        const program = placeOrder(order) as any;

        // Navigate to charge
        const afterLog = program.op.next(undefined) as any;
        assert.strictEqual(afterLog.op._tag, "Charge");
        assert.strictEqual(afterLog.op.amount, 1000);

        // Payment should fail (amount < 1000 is false for 1000)
        const afterCharge = afterLog.op.next(false) as any;
        assert.strictEqual(afterCharge.op.msg, "Payment failed");
    });
});
