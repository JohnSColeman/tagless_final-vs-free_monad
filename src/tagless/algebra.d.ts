/*
 * The algebra declares all the domains capabilities.
 * Algebra is entirely abstract which allows readers to comprehend the
 * domain concepts free of the clutter of implementation details. This
 * helps developers onboard and deliver sustainable code and means that
 * the domain is adaptable to entirely different applications.
 *
 * The effect type F allows different interpreters to implement capabilities
 * using different effect systems (e.g., Promise, IO, Task).
 */

// ---- Domain capabilities ----
import {Order} from "../domain";

/**
 * Payment capability interface.
 * 
 * Represents the ability to charge payment for orders.
 * 
 * @template F - The effect type that wraps the payment result (e.g., Effect<boolean>)
 * 
 * @example
 * ```typescript
 * const paymentInterpreter: Payment<Effect<boolean>> = {
 *   charge: (amount) => Effect.of(amount < 1000)
 * };
 * ```
 */
export interface Payment<F> {
    /**
     * Charges the specified amount for an order.
     * 
     * @param amount - The monetary amount to charge
     * @returns An effect wrapping a boolean indicating payment success (true) or failure (false)
     */
    charge(amount: number): F
}

/**
 * Orders capability interface.
 * 
 * Represents the ability to persist orders to storage.
 * 
 * @template F - The effect type that wraps the void result (e.g., Effect<void>)
 * 
 * @example
 * ```typescript
 * const ordersInterpreter: Orders<Effect<void>> = {
 *   save: (order) => Effect.of(database.insert(order))
 * };
 * ```
 */
export interface Orders<F> {
    /**
     * Persists an order to storage.
     * 
     * @param order - The order to save
     * @returns An effect representing the save operation
     */
    save(order: Order): F
}

/**
 * Email capability interface.
 * 
 * Represents the ability to send email notifications.
 * 
 * @template F - The effect type that wraps the void result (e.g., Effect<void>)
 * 
 * @example
 * ```typescript
 * const emailInterpreter: Email<Effect<void>> = {
 *   send: (to, body) => Effect.of(emailService.send({ to, body }))
 * };
 * ```
 */
export interface Email<F> {
    /**
     * Sends an email to the specified recipient.
     * 
     * @param to - The recipient's email address
     * @param body - The email message body
     * @returns An effect representing the email send operation
     */
    send(to: string, body: string): F
}

/**
 * Logger capability interface.
 * 
 * Represents the ability to log informational messages.
 * 
 * @template F - The effect type that wraps the void result (e.g., Effect<void>)
 * 
 * @example
 * ```typescript
 * const loggerInterpreter: Logger<Effect<void>> = {
 *   info: (msg) => Effect.of(console.log('INFO:', msg))
 * };
 * ```
 */
export interface Logger<F> {
    /**
     * Logs an informational message.
     * 
     * @param msg - The message to log
     * @returns An effect representing the logging operation
     */
    info(msg: string): F
}