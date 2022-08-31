# Context
A *context* governs the lifespan of a task. It can be canceled at will, or automatically after a given deadline.
The task and any subtasks are notified when the context ends, allowing for clean shutdowns.

This is a subset of the [Go context](https://pkg.go.dev/context) package adapted to JavaScript and Promises.

## Usage Example

```typescript
import { RootContext } from '@mrubiosan/context'

function someAsyncOperation(ms: number): Promise<void> {
  return new Promise(resolve => {
    setTimeout(resolve, ms).unref()
  })
}

async function main() {
  const [ctx, cancel] = RootContext.withTimeout(1500)
  try {
    await ctx.race(someAsyncOperation(2000))
  } finally {
    cancel()
  }
}

main()

```

