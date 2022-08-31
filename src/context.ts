import { Canceled, ContextError, DeadlineExceeded } from './error'
import { after } from './time'

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
    after(timeout).then(() => { cancel(new DeadlineExceeded()) })

    return [new Context(done), () => { cancel(new Canceled()) }]
  }

  withDeadline(deadline: Date): [Context, Cancel] {
    const now = Date.now()
    const diff = deadline.getTime() - now
    if (diff <= 0) {
      return [new Context(Promise.reject(new DeadlineExceeded())), () => undefined]
    }

    return this.withTimeout(diff)
  }
}

export default new Context(new Promise(() => undefined))
export { Cancel }
