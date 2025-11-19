// ---- Domain Types ----
/**
 * Order domain entity.
 *
 * Represents a customer order in the system.
 *
 * @example
 * ```typescript
 * const order: Order = {
 *   id: "ORD-12345",
 *   customerEmail: "customer@example.com",
 *   amount: 99.99
 * };
 * ```
 */
export interface Order {
    /**
     * Unique identifier for the order.
     */
    id: string

    /**
     * Email address of the customer who placed the order.
     */
    customerEmail: string

    /**
     * Monetary amount of the order.
     */
    amount: number
}
