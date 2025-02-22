import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export type Handler = (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;

export function lambdaBaseErrorHandler(handler: Handler): Handler {
    return async (event) => {
        try {
            return await handler(event);
        } catch (error: any) {
            console.log('Error occurred in Lambda execution:', error);

            // Handle specific known error scenarios
            if (error instanceof ValidationError) {
                return {
                    statusCode: 400,
                    body: JSON.stringify({ error: 'Invalid input', details: error.message }),
                };
            }

            // Handle specific known error scenarios
            if (error instanceof NotFoundError) {
              return {
                  statusCode: 404,
                  body: JSON.stringify({ error: 'Not Found', details: error.message }),
              };
          }

            // Provide a generic 500 error for unknown issues
            return {
                statusCode: 500,
                body: JSON.stringify({ error: 'Internal Server Error', details: error.message }),
            };
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