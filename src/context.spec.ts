import { RootContext, Context, Cancel } from './context'
import { Canceled, DeadlineExceeded } from './error'

jest.useFakeTimers()

function after(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms).unref()
  })
}

describe.each([
  ['RootContext', RootContext],
  ['RootContext.withCancel', RootContext.withCancel()[0]],
  ['RootContext.withTimeout', RootContext.withTimeout(1000)[0]],
  ['RootContext.withDeadline', RootContext.withDeadline(new Date(Date.now() + 1000))[0]],
])('Non-canceled %s', (_, ctx) => {
  it('is not done', async () => {
    const successPromise = after(10).then(() => true)
    jest.advanceTimersByTime(10)
    await expect(Promise.race([ctx.done(), successPromise])).resolves.toBe(true)
  })

  it('race always resolves', async () => {
    const successPromise = after(10).then(() => true)
    jest.advanceTimersByTime(10)
    await expect(ctx.race(successPromise)).resolves.toBe(true)
  })

  it('does not bubble up when child is canceled', async () => {
    const [childCtx, childCancel] = ctx.withCancel()
    childCancel()
    await expect(childCtx.done()).resolves.toBeUndefined()

    const successPromise = after(10).then(() => true)
    jest.advanceTimersByTime(10)
    await expect(ctx.race(successPromise)).resolves.toBe(true)
  })
})

describe.each([
  ['RootContext.withCancel', ...RootContext.withCancel()],
  ['RootContext.withTimeout', ...RootContext.withTimeout(1000)],
  ['RootContext.withDeadline', ...RootContext.withDeadline(new Date(Date.now() + 1000))],
])('Canceled %s', (_, ctx: Context, cancel: Cancel) => {
  beforeEach(() => {
    cancel()
  })

  it('is done', async () => {
    await expect(ctx.done()).resolves.toBeUndefined()
  })

  it('cascades cancel to children', async () => {
    const [child] = ctx.withCancel()
    await expect(child.done()).resolves.toBeUndefined()
  })

  it('rejects on race', async () => {
    await expect(ctx.race(after(1))).rejects.toBeInstanceOf(Canceled)
  })

  it('returns Canceled error', async () => {
    await expect(ctx.done()).resolves.toBeUndefined()
    await expect(ctx.err()).resolves.toBeInstanceOf(Canceled)
  })
})

describe('Context.withDeadline', () => {
  it('immediately rejects deadlines not in the future', async () => {
    const now = new Date()
    const [ctx] = RootContext.withDeadline(now)
    await expect(ctx.err()).resolves.toBeInstanceOf(DeadlineExceeded)
  })
})

describe('Context.withTimeout', () => {
  it('rejects after given time has passed', async () => {
    const [ctx] = RootContext.withTimeout(100)
    jest.advanceTimersByTime(100)
    await expect(ctx.err()).resolves.toBeInstanceOf(DeadlineExceeded)
  })
})

describe('Context.toAbortSignal', () => {
  it('creates a context bound AbortSignal', async () => {
    const [ctx, cancel] = RootContext.withCancel()
    const signal = ctx.toAbortSignal()
    expect(signal.aborted).toBe(false)

    cancel()
    await ctx.done()
    expect(signal.aborted).toBe(true)
    // @ts-ignore
    expect(signal.reason).toBeInstanceOf(Canceled)
  })
})
