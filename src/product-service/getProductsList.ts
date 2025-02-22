import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { products } from './mocks';
import { lambdaBaseErrorHandler } from './utils';
import { corsHeaders } from './constants';

export const handler = lambdaBaseErrorHandler(async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    },
    body: JSON.stringify(products),
  };
});


