# Tagless Final vs Free Monad
This project demonstrates using a practical example how the basics of functional programming can be
implemented in TypeScript.

A [paper by John Backus](https://doi.org/10.1145/359576.359579) says that one of the key advantages
of functional programing is 'combining forms', which is a way of building sophisticated programs up by
joining programs together.

- Two patterns:
  1. Tagless Final (final encoding)
  2. Free Monad (initial encoding, AST + interpreter)
- Same domain logic
- Comparable structure
- Plain TypeScript, minimal libraries (no ZIO, no fp-ts)

Both implementations offer a thorough and effective method for separation of concerns and
are unbound from any runtime concerns. Mocking is trivial and tests are easy to build.

Implement the domain logic for “Place an order” - steps:
1. Validate the incoming order
2. Charge the customer
3. Save the order
4. Send confirmation email

This is a classic “application service” with multiple interpretable effects.

## Tagless Final
"I describe how to do things, in abstract form, and supply concrete implementations."
- Effects are represented as interfaces over a type constructor F.
- Programs are written against capability interfaces.
- Interpretation happens "inline" by supplying concrete instances of F.

### ⚠️ Important Note on Complexity

This project contains a **simplified, pedagogical implementation** of tagless final that demonstrates
the core concepts without overwhelming complexity. Real-world tagless final implementations require
significantly more machinery: typeclass abstractions (Monad, MonadError, Async, Bracket), error type
threading, resource management, and extensive boilerplate.

**For a detailed discussion of what's missing and why**, see:
👉 **[TAGLESS_FINAL_COMPLEXITY.md](./TAGLESS_FINAL_COMPLEXITY.md)**

This document explains:
- What the simple implementation omits
- The true complexity of production tagless final (with code examples)
- Pain points discussed by John A. De Goes in "The Death of Tagless Final"
- Alternative approaches (Module Pattern / ZIO Environment)
- When to use each pattern

The project includes both:
- **Simple version**: `src/tagless/algebra.d.ts`, `src/tagless/Effect.ts` (great for learning)
- **Complex version**: `src/tagless/algebra-complex.d.ts`, `src/tagless/typeclasses.ts` (shows reality)

### Code Structure
The [algebra](./src/tagless/algebra.d.ts) is analogous to creating skeletal classes in OOP, but in FP
the functions related to a domain are not bound directly to its type
declaration. The algebra can be declared by translating from the domain
documentation which makes this approach easy to adopt for Domain-driven Design.

The [logic](./src/tagless/logic.ts) is where elements from the algebra are combined to declare
the business logic. This makes the flow of business logic of the application
transparent. Business logic is explicitly declared instead of being obscured as
often seen in badly implemented OOP projects.

An [interpreter](./src/tagless/interpreter.ts) provides an executable application by defining the function
bodies that implement the capabilities of the algebra. A monad implementation
must be provided with the minimal behaviours required to combine ("chain")
and transform ("map") the effects.

### Tagless Final Characteristics
- No data structure is produced — everything executes “as you go.”
- Easy to substitute interpreters (e.g., for testing).
- Very fast and lightweight.
- Harder to do things like: replay, analyze, batch, optimize.

## Free Monad
"I describe what to do as a pure data structure. Someone else decides how to run it."
- All operations build an AST (a data structure).
- The program is pure; no effects until interpreted.
- Interpreters fold the AST into real effects.

### ⚠️ Important Note on Complexity

This project contains a **simplified, pedagogical implementation** of free monads that demonstrates
the core concepts without overwhelming complexity. Real-world free monad implementations require
significantly more machinery: stack-safety mechanisms (trampolining or Church encoding), error type
threading, resource management (bracket patterns), and ergonomic improvements to avoid deeply nested
callback hell.

**For a detailed discussion of what's missing and why**, see:
👉 **[FREE_MONAD_COMPLEXITY.md](./FREE_MONAD_COMPLEXITY.md)**

This document explains:
- What the simple implementation omits (stack safety, error handling, resource management)
- The true complexity of production free monads (with code examples)
- Pain points: nested callbacks, stack overflow on large programs, performance overhead (50-100x slower)
- When free monads are actually useful (DSLs, program analysis, multiple backends, audit trails)
- Modern alternatives (Effect systems like ZIO, algebraic effects, module pattern, async/await with DI)
- Code comparison between simple demo and production-grade implementations

### Code Structure
The [algebra](./src/free/algebra.d.ts) is an abstract syntax tree (AST) that can then be
folded/interpreted in many ways (sync, async, logging, mock, etc.), but the structure
of the program is reified as data. This perfectly supports Domain-Driven Design because
the algebra is derived almost verbatim from the ubiquitous language or domain documentation.
The free monad makes the program an explicit, inspectable AST.

The [constructors](./src/free/constructors.ts) functions are the heart of the classic “free monad + ADT” style
— they are pure, total, data-constructors that build the AST (abstract syntax tree) of
the program, step by step.

The [functor](./src/free/functor.ts) transforms an instruction that eventually yields an A 
into one that yields a B, by pushing the transformation f into the continuation. This permits
operations to be chained.

The [logic](./src/free/logic.ts) is where elements from the algebra are constructed and
combined to declare the business logic. This makes the flow of business logic of the 
application transparent. Business logic is explicitly declared instead of being obscured as
often seen in badly implemented OOP projects. Note that the free monad pattern results
in deeply nested function calls that require the constructors which does not make
for easy reading.

An [interpreter](./src/free/interpreter.ts) provides an executable application by mapping
the operations of the abstract syntax tree to functions that implement them, ultimately resolving
to the final result value after all operations are executed.

The [free monad](./src/free/Free.ts) can be implemented in 2 styles, either the discriminated union style that
is used in this solution, or the Church-encoded style as shown below. Church refers to the
mathematician Alonzo Church.

```typescript
export type Free<A> = <R>(
    onPure: (value: A) => R,
    onImpure: (op: Op<Free<A>>) => R
) => R
```

### Free Monad Characteristics
- An explicit data structure (AST) is produced — the program is a value that fully describes the computation.
- You can inspect, transform, replay, serialize, optimize, or batch the entire program before running it.
- Interpretation is completely separate from construction — you decide later (or multiple times) how to run it.
- Naturally stack-safe when using the Church-encoded or trampolined variants; the classic initial encoding can
  blow the stack on very deep left-nested binds.

# Comparison Table
The different solution patterns for functional programming have different applications and of course
different tradeoffs. Business applications will typically be a better fit for tagless final style,
unless they happen to form a DSL in their own right, in which case the free monad approach is a better fit.

| Feature                 | Tagless Final                   | Free Monad                                   |
| ----------------------- | ------------------------------- | -------------------------------------------- |
| **Program shape**       | Functions over effects (`F`)    | Data structure (AST)                         |
| **Interpretation time** | Immediately during construction | Deferred until runFree                       |
| **Testing**             | Swap interpreters easily        | Even easier: inspect the AST without running |
| **Introspection**       | Hard                            | Easy (you have a full tree)                  |
| **Global optimization** | Hard                            | Easy (analyze AST)                           |
| **Replaying**           | Hard                            | Easy                                         |
| **Serialization**       | Not natural                     | Natural — serialize AST                      |
| **Runtime speed**       | Fast (inlined)                  | Slower unless optimized                      |
| **Code style**          | Interface-heavy                 | Algebra + constructors + interpreter         |
| **Requirements**        | Just typeclasses                | Need monad machinery and folding             |
| **Typical use cases**   | Business apps, DI, testing      | DSLs, workflows, automation, compilers       |
