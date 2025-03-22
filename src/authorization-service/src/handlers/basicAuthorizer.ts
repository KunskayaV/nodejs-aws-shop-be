import { APIGatewayAuthorizerEvent, APIGatewayAuthorizerResult, APIGatewayTokenAuthorizerEvent } from 'aws-lambda';
import { logEvent } from '../common/utils';
import { corsHeaders, USER_NAME, USER_PASSWORD } from '../common/constants';

export const handler = async (event: APIGatewayTokenAuthorizerEvent): Promise<APIGatewayAuthorizerResult> => {
  logEvent(`basicAuthorizer is invoked with event: ${JSON.stringify(event)}.`);

  try {
    const authorizationHeader = event.authorizationToken;

    if (!authorizationHeader) {
      throw new Error('Unauthorized: Missing Authorization header');
    }

    // Check if it's Basic auth
    if (!authorizationHeader.startsWith('Basic ')) {
      throw new Error('Unauthorized: Invalid authorization type');
    }

    // Extract and decode credentials
    const base64Credentials = authorizationHeader.split(' ')[1];
    if (!base64Credentials) {
      throw new Error('Unauthorized: Invalid credentials');
    }

    const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
    const [username, password] = credentials.split('=');

    // Get credentials from environment variables
    const validUsername = USER_NAME;
    const validPassword = USER_PASSWORD;

    if (!validUsername || !validPassword) {
      throw new Error('Internal Server Error: Missing environment variables');
    }

    // Validate credentials
    if (username === validUsername && password === validPassword) {
      return addCORSHeaders(generatePolicy('user', 'Allow', event.methodArn));
    } else {
      return addCORSHeaders(generatePolicy('user', 'Deny', event.methodArn));
    }

  } catch (error) {
    const err = error as Error;

    logEvent(`Authorization error: ${err.message}`);

    if (err.message.includes('Missing Authorization header')) {
      throw new Error('Unauthorized'); // Will result in 401
    }
    
    return addCORSHeaders(generatePolicy('user', 'Deny', event.methodArn)); // Will result in 403
  }
};

const generatePolicy = (
  principalId: string,
  effect: 'Allow' | 'Deny',
  resource: string
): APIGatewayAuthorizerResult => {
  return {
    principalId,
    policyDocument: {
      Version: '2012-10-17',
      Statement: [
        {
          Action: 'execute-api:Invoke',
          Effect: effect,
          Resource: resource
        }
      ]
    }
  };
};

const addCORSHeaders = (response: APIGatewayAuthorizerResult): APIGatewayAuthorizerResult => {
  return {
    ...response,
    context: corsHeaders,
  };
}

export const lambdaHandler = handler;