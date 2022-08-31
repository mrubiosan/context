import { Canceled, ContextError, DeadlineExceeded } from './error'

type Cancel = () => void;
type Reject = (arg0: any) => void;

function buildPromise(): [Promise<never>, Reject] {
  let cancel: Reject
  const done = new Promise<never>((_, reject) => {
    cancel = reject
  })
  // @ts-ignore
  return [done, cancel]
}

class Context {
  private readonly p: Promise<never>

  constructor(done: Promise<never>) {
    this.p = done
  }

  done(): Promise<void> {
    return this.p.catch(() => undefined)
  }

  err(): Promise<ContextError> {
    return this.p.catch((e) => e)
  }

  race<T>(p: Promise<T>): Promise<Awaited<T>> {
    return Promise.race([this.p, p]) as Promise<Awaited<T>>
  }

  withCancel(): [Context, Cancel] {
    const [done, cancel] = buildPromise()
    this.p.catch((e) => { cancel(e) })

    return [new Context(done), () => { cancel(new Canceled()) }]
  }

  withTimeout(timeout: number): [Context, Cancel] {
    const [done, cancel] = buildPromise()
    this.p.catch((e) => { cancel(e) })

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

  withDeadline(deadline: Date): [Context, Cancel] {
    const now = Date.now()
    const diff = deadline.getTime() - now
    if (diff <= 0) {
      return [new Context(Promise.reject(new DeadlineExceeded())), () => undefined]
    }

    return this.withTimeout(diff)
  }

  toAbortSignal(): AbortSignal {
    const controller = new AbortController()
    this.p.catch((e) => {
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
