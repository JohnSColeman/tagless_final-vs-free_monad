/*
 * The algebra declares all the domains capabilities.
 * Algebra is entirely abstract which allows readers to comprehend the
 * domain concepts free of the clutter of implementation details. This
 * helps developers onboard and deliver sustainable code and means that
 * the domain is adaptable to entirely different applications.
 *
 * The type A represents the continuation - what happens next after the
 * operation completes.
 */

// Program as a free monad over Op<A>
import {Order} from "../domain";

/**
 * Represents the continuation function type.
 * 
 * @template A - The type of the rest of the computation that follows
 * 
 * A continuation function that takes the result of an operation (of any type)
 * and produces the next step in the computation chain. This is the core of
 * continuation-passing style (CPS) used in free monads.
 * 
 * @param x - The result value from the completed operation
 * @returns The continuation value representing the rest of the computation
 * 
 * @example
 * ```typescript
 * // A continuation that transforms the result and continues
 * const next: Next<Free<string>> = (orderId) => 
 *   Pure({ _tag: "Pure", value: `Order ${orderId} processed` });
 * ```
 */
type Next<A> = (x: any) => A

/**
 * Operation functor representing domain capabilities in a free monad algebra.
 * 
 * @template A - The continuation type representing what computation follows this operation
 * 
 * `Op<A>` is a functor that describes operations without executing them. Each operation
 * variant captures the intent and parameters of a domain action, along with a continuation
 * function (`next`) that defines what happens after the operation completes.
 * 
 * When used as `Op<Free<A>>` in the free monad, it creates a recursive structure where
 * each operation links to the next computation, allowing complex operation chains to be
 * built declaratively and interpreted later.
 * 
 * The type parameter `A` enables the functor property - you can map over the continuation
 * type to transform the "rest of the computation" without executing anything.
 * 
 * @example
 * ```typescript
 * // An operation that charges an amount and continues with the next computation
 * const chargeOp: Op<Free<void>> = {
 *   _tag: "Charge",
 *   amount: 100,
 *   next: (chargeResult) => Pure({ _tag: "Pure", value: undefined })
 * };
 * ```
 */
export type Op<A> =
    | { _tag: "Charge"; amount: number; next: Next<A> }
    | { _tag: "Save"; order: Order; next: Next<A> }
    | { _tag: "Send"; to: string; body: string; next: Next<A> }
    | { _tag: "Log"; msg: string; next: Next<A> }
