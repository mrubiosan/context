import { Canceled, ContextError, DeadlineExceeded } from './error'

type Cancel = () => void;
type Resolve = (error: ContextError) => void;

function buildPromise(): [Promise<ContextError>, Resolve] {
  let cancel: Resolve
  const done = new Promise((resolve) => {
    cancel = resolve
  })
  // The Promise executor is run synchronously as per ECMAScript spec. So cancel is guaranteed to be set.
  // @ts-ignore
  return [done, cancel]
}

class Context {
  private readonly p: Promise<ContextError>

  constructor(done: Promise<ContextError | never>) {
    this.p = done
  }

  /**
   * Resolves when the context has been canceled.
   */
  done(): Promise<void> {
    return this.p.then(() => undefined)
  }

  /**
   * Resolves when the context has been canceled with the reason why.
   */
  err(): Promise<ContextError> {
    return this.p
  }

  /**
   * Rejects if the context is canceled before _p_ is resolved.
   */
  race<T>(p: Promise<T>): Promise<Awaited<T>> {
    return Promise.race([this.p.then(e => Promise.reject(e)), p]) as Promise<Awaited<T>>
  }

  /**
   * Creates a new child cancelable context. If the parent is canceled it cascades.
   */
  withCancel(): [Context, Cancel] {
    const [done, cancel] = buildPromise()
    this.p.then((e) => { cancel(e) })

    return [new Context(done), () => { cancel(new Canceled()) }]
  }

  /**
   * Creates a new child cancelable context, which auto-cancels after the given timeout.
   * If the parent is canceled it cascades.
   */
  withTimeout(timeout: number): [Context, Cancel] {
    const [done, cancel] = buildPromise()
    this.p.then((e) => { cancel(e) })

    const timer = setTimeout(() => {
      cancel(new DeadlineExceeded())
    }, timeout)

    return [
      new Context(done),
      () => {
        clearTimeout(timer)
        cancel(new Canceled())
      }
    ]
  }

  /**
   * Creates a new child cancelable context, which auto-cancels after the given deadline passes.
   * If the parent is canceled it cascades.
   */
  withDeadline(deadline: Date): [Context, Cancel] {
    const now = Date.now()
    const diff = deadline.getTime() - now
    if (diff <= 0) {
      return [new Context(Promise.resolve(new DeadlineExceeded())), () => undefined]
    }

    return this.withTimeout(diff)
  }

  /**
   * Utility method to convert the context into an AbortSignal.
   */
  toAbortSignal(): AbortSignal {
    const controller = new AbortController()
    this.p.then((e) => {
      // The abort method does not always accept a parameter, but it's fine to pass it anyway.
      // @ts-ignore
      controller.abort(e)
    })
    return controller.signal
  }
}

export const RootContext = new Context(new Promise(() => undefined))
type ContextType = InstanceType<typeof Context>;
export {
  Cancel,
  ContextType as Context,
}
