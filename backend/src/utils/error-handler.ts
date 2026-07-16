import { Prisma } from '@prisma/client';
import type { ErrorRequestHandler } from 'express';
import { AppError } from './app-error.js';

export const errorHandler: ErrorRequestHandler = (error, _request, response, _next) => {
  if (error instanceof AppError) {
    response.status(error.statusCode).json({ message: error.message });
    return;
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') {
      response.status(404).json({ message: 'Item not found.' });
      return;
    }

    response.status(500).json({ message: 'Database operation failed.' });
    return;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    response.status(400).json({ message: 'Invalid item data.' });
    return;
  }

  if (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientRustPanicError
  ) {
    response.status(503).json({ message: 'Database is temporarily unavailable.' });
    return;
  }

  console.error('Unhandled API error:', error instanceof Error ? error.message : error);
  response.status(500).json({ message: 'An unexpected server error occurred.' });
};
