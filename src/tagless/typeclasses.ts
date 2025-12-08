/*
 * Typeclass layer for Tagless Final
 * 
 * This file demonstrates the "true complexity" of tagless final that requires
 * explicit typeclass abstractions. In production tagless final code, you need
 * to abstract over different effect capabilities.
 * 
 * This is one of the pain points John A. De Goes discusses - the ceremony and
 * complexity of maintaining these abstraction layers.
 */

/**
 * The Functor typeclass - ability to map over an effect.
 * 
 * This is the most basic typeclass, representing types that can be mapped over.
 * 
 * @template F - The higher-kinded type (e.g., Effect, Promise, Array)
 */
export interface Functor<F> {
    /**
     * Transform the value inside F using a pure function.
     */
    map<A, B>(fa: HKT<F, A>, f: (a: A) => B): HKT<F, B>
}

/**
 * The Monad typeclass - ability to sequence effects.
 * 
 * Provides the fundamental operations for chaining effectful computations.
 * This is required by almost all tagless final programs.
 * 
 * @template F - The higher-kinded type
 */
export interface Monad<F> extends Functor<F> {
    /**
     * Lift a pure value into the effect context.
     * Also known as "pure" or "return" in Haskell.
     */
    of<A>(a: A): HKT<F, A>
    
    /**
     * Sequence two effects, where the second depends on the first.
     * Also known as "bind" or "flatMap".
     */
    chain<A, B>(fa: HKT<F, A>, f: (a: A) => HKT<F, B>): HKT<F, B>
}

/**
 * The MonadError typeclass - ability to handle errors.
 * 
 * Extends Monad with error handling capabilities. This is where tagless final
 * gets more complex - you need to thread error types through your entire program.
 * 
 * @template F - The higher-kinded type
 * @template E - The error type
 */
export interface MonadError<F, E> extends Monad<F> {
    /**
     * Raise an error in the effect context.
     */
    throwError<A>(e: E): HKT<F, A>
    
    /**
     * Handle errors by providing a recovery function.
     */
    catchError<A>(fa: HKT<F, A>, f: (e: E) => HKT<F, A>): HKT<F, A>
}

/**
 * The Async typeclass - ability to execute asynchronous effects.
 * 
 * Represents effects that can perform asynchronous computations.
 * This adds another layer of constraints to your signatures.
 * 
 * @template F - The higher-kinded type
 */
export interface Async<F> extends MonadError<F, Error> {
    /**
     * Suspend an asynchronous computation.
     */
    async<A>(f: () => Promise<A>): HKT<F, A>
    
    /**
     * Execute effects in parallel and collect results.
     */
    parallel<A>(effects: HKT<F, A>[]): HKT<F, A[]>
}

/**
 * The Bracket typeclass - resource safety.
 * 
 * Provides safe resource acquisition and release, ensuring cleanup
 * even in the face of errors or cancellation.
 * 
 * @template F - The higher-kinded type
 */
export interface Bracket<F> extends MonadError<F, Error> {
    /**
     * Safely acquire and release a resource.
     * 
     * @param acquire - Effect that acquires the resource
     * @param use - Effect that uses the resource
     * @param release - Effect that releases the resource (always runs)
     */
    bracket<A, B>(
        acquire: HKT<F, A>,
        use: (a: A) => HKT<F, B>,
        release: (a: A) => HKT<F, void>
    ): HKT<F, B>
}

/**
 * Higher-Kinded Type encoding for TypeScript.
 * 
 * TypeScript doesn't have native HKTs, so we need this workaround.
 * This is additional complexity that developers must understand.
 * 
 * The URI is a unique identifier for each type constructor.
 */
export interface HKT<URI, A> {
    readonly _URI: URI
    readonly _A: A
}

/**
 * Type-level map from URI to concrete type.
 * Each interpreter must register its type here.
 */
export interface URItoKind<A> {
    // Will be extended by concrete implementations
}

/**
 * Helper type to extract the concrete type from an HKT.
 */
export type Kind<URI extends keyof URItoKind<any>, A> = URItoKind<A>[URI]
