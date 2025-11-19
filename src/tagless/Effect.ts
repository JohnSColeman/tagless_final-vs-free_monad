/*
 * An Effect must be implemented with functions to combine the capabilities
 * defined in the algebra and for the contained value to be transformed.
 */

/**
 * Effect type representing a computation that produces a value of type A.
 * 
 * This interface provides the minimal monadic operations needed to sequence
 * and transform computations in the tagless final pattern. Different
 * interpreters can implement Effect using various underlying representations
 * (e.g., Promise, IO, Task, synchronous values).
 * 
 * @template A - The type of value produced by this effect
 * 
 * @example
 * ```typescript
 * // Chain multiple effects together
 * const result: Effect<string> = Effect.of(5)
 *   .map(x => x * 2)           // Effect<number>
 *   .chain(x => Effect.of(String(x)))  // Effect<string>
 * 
 * // Use with tagless final capabilities
 * const workflow: Effect<void> = 
 *   logger.info("Starting")
 *     .chain(() => payment.charge(100))
 *     .chain(success => success 
 *       ? orders.save(order)
 *       : Effect.of(undefined)
 *     );
 * ```
 */
export interface Effect<A> {
    /**
     * Sequences this effect with another effect-producing function.
     * 
     * Also known as `flatMap` or `bind` in other functional programming contexts.
     * The chain method allows you to perform dependent computations where the
     * next effect depends on the result of the previous effect.
     * 
     * @template B - The type of value produced by the next effect
     * @param f - A function that takes the value from this effect and returns a new effect
     * @returns A new effect that sequences both computations
     * 
     * @example
     * ```typescript
     * // Chain dependent operations
     * const workflow = payment.charge(100)
     *   .chain(success => {
     *     if (success) {
     *       return logger.info("Payment successful");
     *     } else {
     *       return logger.info("Payment failed");
     *     }
     *   });
     * 
     * // Chain multiple operations in sequence
     * const result = Effect.of(5)
     *   .chain(x => Effect.of(x * 2))
     *   .chain(x => Effect.of(x + 1))  // 11
     * ```
     */
    chain<B>(f: (a: A) => Effect<B>): Effect<B>
    
    /**
     * Transforms the value inside this effect using a pure function.
     * 
     * The map method applies a function to the value contained in the effect
     * without changing the effect structure. This is useful for transforming
     * values while preserving the effect context.
     * 
     * @template B - The type of the transformed value
     * @param f - A function that transforms the value from type A to type B
     * @returns A new effect containing the transformed value
     * 
     * @example
     * ```typescript
     * // Transform values in an effect
     * const doubled = Effect.of(5)
     *   .map(x => x * 2);  // Effect<number> containing 10
     * 
     * // Map in a workflow
     * const message = payment.charge(100)
     *   .map(success => success ? "✓ Paid" : "✗ Failed");
     * 
     * // Chain multiple transformations
     * const result = Effect.of("hello")
     *   .map(s => s.toUpperCase())
     *   .map(s => s + "!");  // Effect<string> containing "HELLO!"
     * ```
     */
    map<B>(f: (a: A) => B): Effect<B>
}

/**
 * Creates an Effect containing the given value.
 * 
 * This is the monadic "pure" or "return" operation that lifts a plain value
 * into the Effect context. It's the simplest way to create an Effect and is
 * often used as a starting point for effect chains or to wrap values in
 * conditional logic.
 * 
 * @template A - The type of the value to wrap
 * @param a - The value to lift into an Effect
 * @returns An Effect containing the provided value
 * 
 * @example
 * ```typescript
 * // Create a simple effect
 * const effect = of(42);  // Effect<number>
 * 
 * // Use in conditional logic
 * const result = success 
 *   ? orders.save(order)
 *   : of<void>(undefined);
 * 
 * // Start a chain of operations
 * const workflow = of(5)
 *   .map(x => x * 2)
 *   .chain(x => logger.info(`Result: ${x}`));
 * 
 * // Wrap a value for consistency
 * function maybeGetUser(id: string): Effect<User | null> {
 *   const user = database.find(id);
 *   return of(user);
 * }
 * ```
 */
export const of = <A>(a: A): Effect<A> => ({
    chain: f => f(a),
    map: f => of(f(a))
})

/**
 * The canonical "successful empty" value of the {@link Effect} monad.
 *
 * Represents a computation that succeeds and produces no meaningful result
 * (i.e. the monadic unit for `Effect<void>`). It is completely equivalent to
 * `of<void>(undefined)` but given a dedicated name for clarity and idiomatic use.
 *
 * ## Why use `unit` instead of `of<void>(undefined)`?
 *
 * ```ts
 * // Verbose and noisy
 * db.save(user).chain(() => of<void>(undefined))
 *
 * // Clear intent, idiomatic FP style
 * db.save(user).chain(() => unit)
 * ```
 *
 * Thanks to the monad right-identity law, chaining `unit` at the end of a
 * workflow is almost always unnecessary — you can simply omit it:
 *
 * ```ts
 * const program: Effect<void> =
 *   logger.info("Starting")
 *     .chain(() => backup.run())
 *     .chain(() => logger.info("Finished"))
 *     // no explicit `unit` needed here
 * ```
 *
 * Use `unit` explicitly when you need a clear "no-op success" value inside a
 * branch or when the return type forces you to produce an `Effect<void>`.
 *
 * @example
 * function deleteUser(id: string): Effect<void> {
 *   return db.delete(id)
 *     .chain(wasDeleted =>
 *       wasDeleted
 *         ? logger.info(`User ${id} deleted`)
 *         : logger.warn(`User ${id} not found`)
 *     )
 *     .chain(() => unit) // explicit success with no value
 * }
 *
 * @see {@link of} – the general `pure`/`return` operation
 * @category Constants
 */
export const unit: Effect<void> = of<void>(undefined)