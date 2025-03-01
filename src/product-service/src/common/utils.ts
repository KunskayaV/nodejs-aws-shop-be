import { APIGatewayProxyEventV2, APIGatewayProxyResultV2, ProxyResult } from 'aws-lambda';
import { StatusCodes } from 'http-status-codes';

import { baseHeaders, corsHeaders } from './constants';

export type Handler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;

export const createResponse = (statusCode: number, body = {}): ProxyResult => ({
  statusCode,
  headers: baseHeaders,
  body: JSON.stringify(body),
});

export function lambdaBaseErrorHandler(handler: Handler): Handler {
  return async (event) => {
    try {
      return await handler(event);
    } catch (error: any) {
      logEvent('Error occurred in Lambda execution:', error);

      // Handle specific known error scenarios
      if (error instanceof ValidationError) {
          return createResponse(
            StatusCodes.BAD_REQUEST,
            { error: 'Invalid input', details: error.message }
          );
      }

      // Handle specific known error scenarios
      if (error instanceof NotFoundError) {
        return createResponse(
          StatusCodes.NOT_FOUND,
          { error: 'Not Found', details: error.message }
        );
      }

      // Provide a generic 500 error for unknown issues
      return  createResponse(
        StatusCodes.INTERNAL_SERVER_ERROR,
        { error: 'Internal Server Error', details: error.message }
      );
    }
  };
}

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
    }
}

export class NotFoundError extends Error {
  constructor(message: string) {
      super(message);
      this.name = 'NotFoundError';
  }
}

export const logEvent = (msg: string, source = 'Lambda') => console.log(`[${source} log] ${msg}`);
