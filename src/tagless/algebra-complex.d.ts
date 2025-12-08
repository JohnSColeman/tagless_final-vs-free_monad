/*
 * Complex Algebra with Multiple Typeclass Constraints
 * 
 * This demonstrates the "true complexity" of tagless final where different
 * operations require different capabilities from the effect type F.
 * 
 * Compare this to the simple algebra.d.ts - here we need to pass typeclass
 * instances explicitly and deal with error types, resource management, etc.
 * 
 * This is closer to what production tagless final code looks like in Scala
 * or Haskell, and illustrates the pain points discussed by John A. De Goes.
 */

import {Order} from "../domain";
import {Monad, MonadError, Async, Bracket} from "./typeclasses";

/**
 * Domain-specific error types.
 * In real tagless final, you need to model errors explicitly.
 */
export type PaymentError = 
    | { type: 'InsufficientFunds'; amount: number }
    | { type: 'CardDeclined'; reason: string }
    | { type: 'PaymentGatewayDown' }

export type OrderError =
    | { type: 'ValidationFailed'; field: string; message: string }
    | { type: 'DatabaseError'; cause: string }
    | { type: 'DuplicateOrder'; orderId: string }

export type EmailError =
    | { type: 'InvalidAddress'; email: string }
    | { type: 'SmtpError'; message: string }

export type AppError = PaymentError | OrderError | EmailError

/**
 * Payment capability with error handling.
 * 
 * Notice how we now need to thread the error type through the signature.
 * The effect F must support MonadError to handle payment failures.
 * 
 * @template F - The effect type that must support error handling
 * 
 * Compare to the simple version:
 * ```typescript
 * interface Payment<F> {
 *   charge(amount: number): F
 * }
 * ```
 * 
 * Now we need:
 * - The monad instance M to sequence operations
 * - Error handling for payment failures
 * - Proper error types instead of just boolean success flags
 */
export interface PaymentComplex<F> {
    /**
     * Charges the specified amount.
     * 
     * Requires MonadError to handle payment failures properly.
     * Returns either success (void) or a PaymentError.
     * 
     * @param M - The MonadError instance for F
     * @param amount - The amount to charge
     * @returns Effect that either succeeds or fails with PaymentError
     */
    charge<M extends MonadError<F, PaymentError>>(
        M: M,
        amount: number
    ): ReturnType<M['of']> // F<void> | F<PaymentError>
}

/**
 * Orders capability with database transaction support.
 * 
 * Saving orders requires:
 * - Async support (database I/O)
 * - Error handling (validation, database errors)
 * - Resource management (database connections via Bracket)
 * 
 * @template F - The effect type with async and resource capabilities
 */
export interface OrdersComplex<F> {
    /**
     * Validates an order.
     * 
     * Pure validation logic but needs Monad to lift into effect context.
     * 
     * @param M - The Monad instance
     * @param order - The order to validate
     * @returns Effect containing validated order or error
     */
    validate<M extends MonadError<F, OrderError>>(
        M: M,
        order: Order
    ): ReturnType<M['of']>
    
    /**
     * Saves an order to the database.
     * 
     * Requires:
     * - Async for database I/O
     * - Bracket for transaction management
     * - MonadError for handling database failures
     * 
     * @param A - The Async instance
     * @param B - The Bracket instance
     * @param order - The order to save
     * @returns Effect representing the save operation
     */
    save<A extends Async<F>, B extends Bracket<F>>(
        A: A,
        B: B,
        order: Order
    ): ReturnType<A['of']>
}

/**
 * Email capability with async sending.
 * 
 * Sending emails is inherently asynchronous and can fail in multiple ways.
 * 
 * @template F - The effect type with async capabilities
 */
export interface EmailComplex<F> {
    /**
     * Sends an email asynchronously.
     * 
     * Requires Async support and error handling for SMTP failures.
     * 
     * @param A - The Async instance
     * @param M - The MonadError instance
     * @param to - Recipient email address
     * @param body - Email body
     * @returns Async effect representing email delivery
     */
    send<A extends Async<F>, M extends MonadError<F, EmailError>>(
        A: A,
        M: M,
        to: string,
        body: string
    ): ReturnType<A['async']>
}

/**
 * Logger capability (simplest case - only needs Monad).
 * 
 * Even the "simple" logger needs a Monad instance to be properly
 * integrated into the tagless final program.
 * 
 * @template F - The effect type
 */
export interface LoggerComplex<F> {
    /**
     * Logs an info message.
     * 
     * Only requires Monad for sequencing, but notice we still need
     * to pass it explicitly.
     * 
     * @param M - The Monad instance
     * @param msg - The message to log
     * @returns Effect representing the logging operation
     */
    info<M extends Monad<F>>(M: M, msg: string): ReturnType<M['of']>
    
    /**
     * Logs an error with structured error data.
     * 
     * @param M - The MonadError instance
     * @param msg - The error message
     * @param error - The structured error
     * @returns Effect representing the logging operation
     */
    error<M extends MonadError<F, AppError>>(
        M: M,
        msg: string,
        error: AppError
    ): ReturnType<M['of']>
}

/**
 * THE PROBLEM ILLUSTRATED:
 * 
 * Look at the signature complexity above. Every single function needs:
 * 1. Explicit typeclass instance parameters (M, A, B, etc.)
 * 2. Complex constraints on F
 * 3. Error type threading
 * 4. ReturnType gymnastics for proper typing
 * 
 * In Scala, this would look like:
 * ```scala
 * def charge[F[_]: MonadError[*, PaymentError]: Async](amount: Double): F[Unit]
 * ```
 * 
 * Compare to the "module pattern" alternative that De Goes proposes:
 * ```typescript
 * interface Payment {
 *   charge(amount: number): Promise<void>
 * }
 * ```
 * 
 * The module pattern:
 * - No F[_] parameter pollution
 * - No typeclass instance threading
 * - Clear, concrete types
 * - Easy to test with mocks
 * - Type inference works perfectly
 * 
 * This is why De Goes argues tagless final is "dead" for most use cases.
 */
