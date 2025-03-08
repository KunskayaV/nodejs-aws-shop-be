import { baseHeaders } from '../src/common/constants';
import { lambdaBaseErrorHandler, Handler, ValidationError, NotFoundError } from '../src/common/utils';
import { APIGatewayProxyEventV2 } from 'aws-lambda';

describe('lambdaBaseErrorHandler', () => {
    let mockHandler: Handler<APIGatewayProxyEventV2>;
    let event: APIGatewayProxyEventV2;

    beforeEach(() => {
        event = {} as APIGatewayProxyEventV2;
        mockHandler = jest.fn();
    });

    test('should handle successful execution', async () => {
        (mockHandler as jest.Mock).mockResolvedValue({
            statusCode: 200,
            headers: baseHeaders,
            body: JSON.stringify({ message: 'Success' }),
        });

        const wrappedHandler = lambdaBaseErrorHandler(mockHandler);
        const result = await wrappedHandler(event);
        expect(result).toEqual({
            statusCode: 200,
            headers: baseHeaders,
            body: JSON.stringify({ message: 'Success' }),
        });
    });

    test('should handle ValidationError', async () => {
        const errorMessage = 'Required field missing';
        (mockHandler as jest.Mock).mockRejectedValue(new ValidationError(errorMessage));

        const wrappedHandler = lambdaBaseErrorHandler(mockHandler);
        const result = await wrappedHandler(event);
        expect(result).toEqual({
            statusCode: 400,
            headers: baseHeaders,
            body: JSON.stringify({ error: 'Invalid input', details: errorMessage }),
        });
    });

    test('should handle NotFoundError', async () => {
        const errorMessage = 'Resource not found';
        (mockHandler as jest.Mock).mockRejectedValue(new NotFoundError(errorMessage));

        const wrappedHandler = lambdaBaseErrorHandler(mockHandler);
        const result = await wrappedHandler(event);
        expect(result).toEqual({
            statusCode: 404,
            headers: baseHeaders,
            body: JSON.stringify({ error: 'Not Found', details: errorMessage }),
        });
    });

    test('should handle generic errors', async () => {
        const errorMessage = 'Something went wrong';
        (mockHandler as jest.Mock).mockRejectedValue(new Error(errorMessage));

        const wrappedHandler = lambdaBaseErrorHandler(mockHandler);
        const result = await wrappedHandler(event);
        expect(result).toEqual({
            statusCode: 500,
            headers: baseHeaders,
            body: JSON.stringify({ error: 'Internal Server Error', details: errorMessage }),
        });
    });
});