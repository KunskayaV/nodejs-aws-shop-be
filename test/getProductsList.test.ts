import { corsHeaders } from '../src/product-service/constants';
import { handler } from '../src/product-service/getProductsList';
import { APIGatewayProxyEventV2, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { products } from '../src/product-service/mocks';

describe('handler', () => {
  const event = {} as APIGatewayProxyEventV2;

  test('should return all products with correct headers and status code', async () => {
    const response = await handler(event) as APIGatewayProxyStructuredResultV2;

    expect(response.statusCode).toBe(200);
    expect(response.headers).toEqual({
      'Content-Type': 'application/json',
      ...corsHeaders
    });
    expect(JSON.parse(response.body || '')).toEqual(products);
  });
});