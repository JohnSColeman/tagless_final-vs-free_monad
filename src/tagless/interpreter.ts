/*
 An interpreter provides the effect implementations and uses the algebra and logic
 to create an executable application.
 */
import {Order} from "../domain";
import type {Email, Logger, Orders, Payment} from "./algebra";
import {placeOrder} from "./logic";
import type {Effect} from "./Effect";

// Concrete interpreter using Promise as F
const fromPromise = <A>(promise: Promise<A>): Effect<A> => ({
    chain: <B>(f: (a: A) => Effect<B>): Effect<B> => fromPromise(promise.then(a => f(a) as B)),
    map: <B>(f: (a: A) => B): Effect<B> => fromPromise(promise.then(f))
});

// Concrete implementations
const PaymentPromise: Payment<Effect<boolean>> = {
    charge: (amount: number) => fromPromise(Promise.resolve(amount < 1000))
}

const OrdersPromise: Orders<Effect<void>> = {
    save: (order: Order) => fromPromise(
        Promise.resolve().then(() => {
            console.log("Saved:", order);
            return undefined;
        })
    )
}

const EmailPromise: Email<Effect<void>> = {
    send: (to: string, body: string) => fromPromise(
        Promise.resolve().then(() => {
            console.log("Email", to, body);
            return undefined;
        })
    )
}

const LoggerPromise: Logger<Effect<void>> = {
    info: (msg: string) => fromPromise(
        Promise.resolve().then(() => {
            console.log("LOG:", msg);
            return undefined;
        })
    )
}

// Using the program
const order: Order = { id: "A1", customerEmail: "a@b.com", amount: 900 }

placeOrder(
    PaymentPromise,
    OrdersPromise,
    EmailPromise,
    LoggerPromise
)(order)
