/// An error carrying an HTTP status code, thrown by services/controllers and
/// translated to a JSON response by the error-handling middleware.
export class HttpError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.details = details
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new HttpError(400, message, details)
  }
  static unauthorized(message = 'Unauthorized') {
    return new HttpError(401, message)
  }
  static forbidden(message = 'Forbidden') {
    return new HttpError(403, message)
  }
  static notFound(message = 'Not found') {
    return new HttpError(404, message)
  }
  static conflict(message = 'Conflict') {
    return new HttpError(409, message)
  }
}
