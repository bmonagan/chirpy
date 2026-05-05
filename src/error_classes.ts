export class BadRequestError extends Error {
    statusCode = 400
    constructor(message: string) {
        super(message)
        this.name = "BadRequestError"
    }
}

export class UnauthorizedError extends Error {
    statusCode = 401
    constructor(message: string) {
        super(message)
        this.name = "UnauthorizedError"
    }
}

export class ForbiddenError extends Error {
    statusCode = 403
    constructor(message: string) {
        super(message)
        this.name = "ForbiddenError"
    }
}

export class NotFoundError extends Error {
    statusCode = 404
    constructor(message: string) {
        super(message)
        this.name = "NotFoundError"
    }
}

export class MethodNotAllowedError extends Error {
    statusCode = 405
    constructor(message: string) {
        super(message)
        this.name = "MethodNotAllowedError"
    }
}

export class ConflictError extends Error {
    statusCode = 409
    constructor(message: string) {
        super(message)
        this.name = "ConflictError"
    }
}

export class UnprocessableEntityError extends Error {
    statusCode = 422
    constructor(message: string) {
        super(message)
        this.name = "UnprocessableEntityError"
    }
}

export class InternalServerError extends Error {
    statusCode = 500
    constructor(message: string) {
        super(message)
        this.name = "InternalServerError"
    }
}