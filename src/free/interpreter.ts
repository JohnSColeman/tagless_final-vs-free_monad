/*
 An interpreter provides the effect implementations and uses the logic
 to create an executable application.
 */
import {Order} from "../domain";
import {placeOrder} from "./logic";
import {Free} from "./Free";

// Interprets and executes a Free monad by recursively evaluating operations and their continuations
export const run = <A>(fa: Free<A>): Promise<A> => {
    // When pure return a final Promise as the product
    if (fa._tag === "Pure") {
        return Promise.resolve(fa.value)
    }

    const op = fa.op

    // For continuation use Promise for the operation and then run the continuation
    switch (op._tag) {
        case "Charge":
            return Promise.resolve(op.amount < 1000)
                .then(res => run(op.next(res)))

        case "Save":
            return Promise.resolve(console.log("Saved:", op.order))
                .then(() => run(op.next(undefined)))

        case "Send":
            return Promise.resolve(console.log("Email", op.to, op.body))
                .then(() => run(op.next(undefined)))

        case "Log":
            return Promise.resolve(console.log("LOG:", op.msg))
                .then(() => run(op.next(undefined)))
    }
}

// Using the program
const order: Order = {id: "A1", customerEmail: "a@b.com", amount: 900}

run(placeOrder(order))
