import { Canceled, ContextError, DeadlineExceeded } from './error'

describe('ContextError', () => {
  it('sets the error name', () => {
    expect(new ContextError('foo').toString()).toBe('ContextError: foo')
  })

  it('populates DeadlineExceeded message', () => {
    expect(new DeadlineExceeded().message).toBe('Deadline has been exceeded')
  })

  it('populates Canceled message', () => {
    expect(new Canceled().message).toBe('Context has been canceled')
  })
})
