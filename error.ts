export class ContextError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = 'ContextError'
  }
}

export class DeadlineExceeded extends ContextError {
  constructor() {
    super('Deadline has been exceeded')
  }
}

export class Canceled extends ContextError {
  constructor() {
    super('Context has been canceled')
  }
}
