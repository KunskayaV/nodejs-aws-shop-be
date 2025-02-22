import { corsHeaders } from '../src/product-service/constants';
import { handler } from '../src/product-service/getProductById';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { products } from '../src/product-service/mocks';

describe('handler', () => {
  const baseEvent = {
    pathParameters: {},
  } as APIGatewayProxyEventV2;

  test('should return a validation error when productId is missing', async () => {
    const event = {
      ...baseEvent,
      pathParameters: {},
    };

    const response = await handler(event) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(400);
    expect(JSON.parse(response.body || '')).toEqual({
      error: 'Invalid input',
      details: "The 'productId' path parameter is required."
    });
  });

  test('should return 404 if product not found', async () => {
    const event = {
      ...baseEvent,
      pathParameters: { productId: 'non-existent-id' },
    };

    const response = await handler(event) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(404);
    expect(JSON.parse(response.body || '')).toEqual({
      error: 'Not Found',
      details: 'The product with provided product id non-existent-id is not found.'
    });
  });

  test('should return product when productId is valid', async () => {
    const validProduct = products[0];
    const event = {
      ...baseEvent,
      pathParameters: { productId: validProduct.id },
    };

    const response = await handler(event) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body || '')).toEqual(validProduct);
    expect(response.headers).toEqual({
      'Content-Type': 'application/json',
      ...corsHeaders
    });
  });
});