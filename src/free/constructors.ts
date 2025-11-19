/*
 Constructors take raw values for each operation in the algebras abstract syntax tree
 and wrap them into Free values that can be composed.
 */
import {Order} from "../domain";
import {Free, liftF, of} from "./Free";

/**
 * Creates a free monad computation that charges a specified amount.
 *
 * This constructor lifts a Charge operation into the Free monad, allowing it to be
 * composed with other operations in a declarative computation chain. The operation
 * describes the intent to charge without actually executing the charge - interpretation
 * happens later when the Free monad is run.
 *
 * @param amount - The amount to charge (numeric value)
 * @returns A Free monad computation that, when interpreted, will execute the charge
 *          operation and produce a boolean result (typically indicating success/failure)
 *
 * @example
 * ```typescript
 * // Create a computation that charges $100
 * const chargeProgram = charge(100);
 *
 * // Compose with other operations
 * const program = chain(charge(100), (success) =>
 *   success ? log("Charge successful") : log("Charge failed")
 * );
 * ```
 */
export const charge = (amount: number): Free<boolean> =>
    liftF({_tag: "Charge", amount, next: x => of(x)})

/**
 * Creates a free monad computation that persists an order in storage.
 *
 * This constructor lifts a Save operation into the Free monad, representing the intent
 * to save the given order. No side-effect occurs at this stage - the actual persistence
 * is performed only when the resulting Free computation is interpreted.
 *
 * @param order - The complete Order object to be saved
 * @returns A Free monad computation that, when interpreted, will save the order
 *          and yield `void` (indicating completion with no meaningful result)
 *
 * @example
 * ```typescript
 * const program = chain(charge(99.99), (ok) =>
 *   ok ? save(myOrder) : log("Not saving order due to failed charge")
 * );
 * ```
 */
export const save = (order: Order): Free<void> =>
    liftF({_tag: "Save", order, next: () => of(undefined)})

/**
 * Creates a free monad computation that sends an email.
 *
 * This constructor lifts a Send operation into the Free monad, expressing the desire
 * to deliver an email to a recipient with the given body. The actual sending is deferred
 * until the Free program is interpreted by a suitable interpreter.
 *
 * @param to   - The recipient's email address
 * @param body - The plain-text or HTML body of the email
 * @returns A Free monad computation that, when interpreted, will send the email
 *          and yield `void`
 *
 * @example
 * ```typescript
 * const notify = send(
 *   "customer@example.com",
 *   "Thank you for your purchase! Your order has been processed."
 * );
 *
 * const program = chain(save(order), () => notify);
 * ```
 */
export const send = (to: string, body: string): Free<void> =>
    liftF({_tag: "Send", to, body, next: () => of(undefined)})

/**
 * Creates a free monad computation that logs a message.
 *
 * This constructor lifts a Log operation into the Free monad, capturing the intent
 * to write a diagnostic or informational message. The actual logging (console, file,
 * remote service, etc.) occurs only during interpretation.
 *
 * @param msg - The message to be logged
 * @returns A Free monad computation that, when interpreted, will emit the message
 *          and yield `void`
 *
 * @example
 * ```typescript
 * const program = chain(charge(50), (success) =>
 *   log(success ? "Payment succeeded" : "Payment declined")
 * );
 * ```
 */
export const log = (msg: string): Free<void> =>
    liftF({_tag: "Log", msg, next: () => of(undefined)})