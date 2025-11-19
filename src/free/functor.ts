import { Op } from "./algebra";

// Functor instance for Op - maps over the continuation
// Each case explicitly preserves operation properties and wraps the continuation
// This pattern is necessary for TypeScript's discriminated union type narrowing
export const mapOp = <A, B>(op: Op<A>, f: (a: A) => B): Op<B> => {
    switch (op._tag) {
        case "Charge":
            return { _tag: "Charge", amount: op.amount, next: (x) => f(op.next(x)) }
        case "Save":
            return { _tag: "Save", order: op.order, next: (x) => f(op.next(x)) }
        case "Send":
            return { _tag: "Send", to: op.to, body: op.body, next: (x) => f(op.next(x)) }
        case "Log":
            return { _tag: "Log", msg: op.msg, next: (x) => f(op.next(x)) }
    }
}
