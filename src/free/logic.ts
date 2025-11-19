import {Order} from "../domain";
import {charge, log, save, send} from "./constructors";
import {chain, Free, unit} from "./Free";

/**
 * Creates a Free monad computation representing the complete order placement workflow.
 * 
 * This function composes a series of operations in the Free monad to handle the full
 * order processing flow: logging, payment charging, conditional order saving based on
 * payment success, sending confirmation email, and final logging. Each operation is
 * sequentially chained, creating a declarative description of the workflow that can
 * be interpreted and executed later.
 *
 * @param order - The order to process
 * @returns A Free monad computation that, when interpreted, executes the complete
 *          order placement workflow and produces void (side effects only)
 */
export function placeOrder(order: Order): Free<void> {
    // Note the inelegant nesting of functions
    // Scala has special 'for comprehension' syntactic sugar to cope with this.
    return chain(log(`Placing order ${order.id}`), () =>
        chain(charge(order.amount), success =>
            chain(log(success ? "Payment success" : "Payment failed"), () =>
                chain(success ? save(order) : unit, () =>
                    chain(send(order.customerEmail, "Your order is confirmed!"), () =>
                        log(`Order ${order.id} flow complete`)
                    ))))
    )
}
