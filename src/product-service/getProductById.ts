import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { lambdaBaseErrorHandler, NotFoundError, ValidationError } from './utils';
import { products } from './mocks';
import { corsHeaders } from './constants';

export const handler = lambdaBaseErrorHandler(async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const productId = event.pathParameters?.productId;

  if (!productId) {
    throw new ValidationError("The 'productId' path parameter is required.");
  }

  const product = products.find(product => product.id === productId);

  if (!product) {
    throw new NotFoundError(`The product with provided product id ${productId} is not found.`);
  }

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    },
    body: JSON.stringify(product),
  };
});