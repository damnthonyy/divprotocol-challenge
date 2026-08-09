import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Request, Response } from 'express'
import { ZodValidationException } from 'nestjs-zod'

/**
 * Normalise toutes les erreurs vers `{ message, code? }`.
 *
 * C'est la forme que le frontend lit deja (frontend/src/api/client.ts) :
 * l'intercepteur axios prend `data.message` et rien d'autre. La forme par defaut
 * de Nest (`{ statusCode, message, error }`) fonctionnerait, mais `message` y est
 * parfois un tableau — l'UI afficherait alors « [object Object] ».
 */
interface ErrorBody {
  message: string
  code?: string
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp()
    const response = context.getResponse<Response>()
    const request = context.getRequest<Request>()

    const { status, body } = this.describe(exception)

    // Les 5xx sont des defauts de notre cote : ils sont journalises avec leur
    // pile. Les 4xx sont des comportements attendus, on ne pollue pas les logs.
    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} -> ${status}`,
        exception instanceof Error ? exception.stack : String(exception),
      )
    }

    response.status(status).json(body)
  }

  private describe(exception: unknown): { status: number; body: ErrorBody } {
    if (exception instanceof ZodValidationException) {
      // nestjs-zod type `getZodError()` de facon lache selon la version de zod ;
      // seul le premier message nous interesse, on remonte l'erreur la plus parlante.
      const zodError = exception.getZodError() as { issues?: Array<{ message?: string }> }
      const issue = zodError.issues?.[0]
      return {
        status: HttpStatus.BAD_REQUEST,
        body: {
          message: issue?.message ?? 'Requete invalide.',
          code: 'VALIDATION_FAILED',
        },
      }
    }

    if (exception instanceof HttpException) {
      const payload = exception.getResponse()

      if (typeof payload === 'string') {
        return { status: exception.getStatus(), body: { message: payload } }
      }

      const record = payload as Record<string, unknown>
      const raw = record.message
      const message = Array.isArray(raw) ? String(raw[0]) : String(raw ?? exception.message)

      return {
        status: exception.getStatus(),
        body: {
          message,
          ...(typeof record.code === 'string' ? { code: record.code } : {}),
        },
      }
    }

    // Erreur non prevue : on ne laisse jamais fuiter un message interne au client.
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: { message: 'Une erreur interne est survenue.', code: 'INTERNAL_ERROR' },
    }
  }
}
