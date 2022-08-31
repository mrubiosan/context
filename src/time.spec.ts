import { after } from './time'

describe('After', () => {
  jest.useFakeTimers()
  it('does not resolve before time has elapsed', async () => {
    const p = after(100)
    const resolved = Promise.resolve(true)
    jest.advanceTimersByTime(50)
    await expect(Promise.race([p, resolved])).resolves.toBe(true)
  })

  it('resolves after time has elapsed', async () => {
    const p = after(100)
    const resolved = Promise.resolve(true)
    jest.advanceTimersByTime(100)
    await expect(Promise.race([p, resolved])).resolves.toBeUndefined()
  })
})
