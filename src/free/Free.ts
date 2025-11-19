/*
 * A simple rather than robust implementation of Free Monad for the sake of comprehension.
 */

import {Op} from "./algebra";
import {mapOp} from "./functor";

/**
 * The Free monad over an arbitrary functor-encoded algebra (Op).
 *
 * Represents a computation in a purely functional way: either a value that has already
 * been computed (Pure), or a suspended effectful operation (Impure) that, when resumed,
 * produces the next step of the computation.
 *
 * This formulation allows you to build complex programs as pure data, separate
 * description from interpretation, enabling testing, logging, batching, and different
 * execution strategies without changing the program itself.
 *
 * @template A - The type of the final result of the computation
 */
export type Free<A> =
    | { _tag: "Pure"; value: A }
    | { _tag: "Impure"; op: Op<Free<A>> }

/**
 * Injects a pure value into the Free monad.
 *
 * This is the unit of the monad: a computation that does nothing but immediately
 * return the given value, with no effects.
 *
 * @param value - The pure value to embed
 * @returns A Free computation that is already completed with the given value
 *
 * @example
 * ```typescript
 * const program = of(42); // Pure(42)
 * ```
 */
export const of = <A>(value: A): Free<A> =>
    ({_tag: "Pure", value})

/**
 * Lifts a single algebraic operation into the Free monad.
 *
 * This is how you introduce effectful steps into a Free program. The operation
 * itself is not executed — it is merely recorded as part of the AST.
 *
 * Equivalent to `Impure(op)`.
 *
 * @param op - The algebraic operation (functor-encoded) to suspend
 * @returns An Impure Free node representing one suspended effect
 *
 * @example
 * ```typescript
 * // Assuming `charge(amount)` returns Op<Free<boolean>>
 * const program = liftF(charge(100));
 * ```
 */
export const liftF = <A>(op: Op<Free<A>>): Free<A> =>
    ({_tag: "Impure", op})

/**
 * Monadic bind (flatMap / chain) for the Free monad.
 *
 * Sequences two computations: runs the first one (`fa`), then feeds its result
 * into the function `f` to obtain the next computation, which is then executed.
 *
 * This is the core operation that allows building complex programs from smaller ones.
 *
 * @param fa - The first computation to run
 * @param f  - A function that takes the result of `fa` and returns the next computation
 * @returns A new Free computation representing the sequential composition
 *
 * @example
 * ```typescript
 * const program = chain(charge(99.99), (success) =>
 *   success ? save(order) : log("Payment failed")
 * );
 * ```
 */
export const chain = <A, B>(fa: Free<A>, f: (a: A) => Free<B>): Free<B> =>
    fa._tag === "Pure"
        ? f(fa.value)
        : {
            _tag: "Impure",
            op: mapOp(fa.op, (next) => chain(next, f))
        }

/**
 * A Free computation that returns `undefined` with no effects.
 *
 * This is the monadic unit value (equivalent to `of(undefined)`), commonly used
 * when you only care about the side effects of a program and not its result.
 *
 * @example
 * ```typescript
 * const program = chain(save(order), () => unit); // or just `save(order)` since it already returns Free<void>
 * ```
 */
export const unit = of(undefined);