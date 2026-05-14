import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify'
import { ZodError } from 'zod'
import { ApiError } from '../lib/errors.js'
import { isProd } from '../lib/env.js'
import { captureException } from '../lib/sentry.js'

export function errorHandler(err: FastifyError, req: FastifyRequest, reply: FastifyReply) {
  if (err instanceof ApiError) {
    return reply.code(err.statusCode).send({ code: err.code, message: err.message, details: err.details })
  }

  if (err instanceof ZodError) {
    return reply
      .code(400)
      .send({ code: 'validation_error', details: err.flatten().fieldErrors })
  }

  // Fastify validation
  if (err.validation) {
    return reply.code(400).send({ code: 'validation_error', details: err.validation })
  }

  req.log.error({ err }, 'Unhandled error')
  captureException(err, { url: req.url, method: req.method, userId: req.currentUser?.id })
  return reply
    .code(err.statusCode ?? 500)
    .send({ code: 'internal_error', message: isProd ? 'Internal Server Error' : err.message })
}

