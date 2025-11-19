import {Order} from "../domain";
import type {Email, Logger, Orders, Payment} from "./algebra";
import {type Effect, of, unit} from "./Effect";

/**
 * Creates a higher-order function for the complete order placement workflow.
 * 
 * This function implements the tagless final pattern by accepting abstract algebra implementations
 * as dependencies (Payment, Orders, Email, Logger), then returning a function that processes orders.
 * The returned function composes these capabilities to execute the full order workflow: logging,
 * payment charging, conditional order saving based on payment success, sending confirmation email,
 * and final logging. Each operation is sequentially chained within the Effect monad.
 *
 * @param payment - The Payment algebra implementation providing charge capability
 * @param orders - The Orders algebra implementation providing save capability  
 * @param email - The Email algebra implementation providing send capability
 * @param log - The Logger algebra implementation providing info logging capability
 * @returns A function that takes an Order and returns an Effect computation representing
 *          the complete order placement workflow, producing void (side effects only)
 */
export function placeOrder(
    payment: Payment<Effect<boolean>>,
    orders: Orders<Effect<void>>,
    email: Email<Effect<void>>,
    log: Logger<Effect<void>>
) {
    // Compare this code to the equivalent logic of the free monad pattern
    return (order: Order): Effect<void> =>
        log.info(`Placing order ${order.id}`)
            .chain(() => payment.charge(order.amount))
            .chain((success: boolean) => {
                const logMsg = success
                    ? log.info("Payment success")
                    : log.info("Payment failed");
                return logMsg.chain(() => of(success));
            })
            .chain((success: boolean) =>
                success ? orders.save(order) : unit
            )
            .chain(() =>
                email.send(order.customerEmail, "Your order is confirmed!")
            )
            .chain(() =>
                log.info(`Order ${order.id} flow complete`)
            )
}
