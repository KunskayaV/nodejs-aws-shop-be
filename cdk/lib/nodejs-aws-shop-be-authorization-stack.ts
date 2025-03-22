import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';

import { Construct } from 'constructs';
import * as path from 'path';

import * as dotenv from 'dotenv';
import { getLambdaBundlingBashCommand } from './helpers';
dotenv.config();

interface INodejsAwsShopBeAuthorizationStackProps extends cdk.StackProps {
  stage: string;
}

export class NodejsAwsShopBeAuthorizationStack extends cdk.Stack {
  public readonly basicAuthorizerArn: string;

  constructor(scope: Construct, id: string, props?: INodejsAwsShopBeAuthorizationStackProps) {
    super(scope, id, props);

    const stage = props?.stage || 'dev';
    const USER_NAME = process.env.USER_NAME || '';
    const USER_PASSWORD = process.env.USER_PASSWORD || '';

    // Create Lambda functions
    const basicAuthorizerLambda = new lambda.Function(this, 'BasicAuthorizerFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/authorization-service'), {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: getLambdaBundlingBashCommand('basicAuthorizer.js'),
        },
      }),
      handler: 'dist/handlers/basicAuthorizer.lambdaHandler',
      memorySize: 128,
      functionName: `basic-authorizer-${stage}`,
      timeout: cdk.Duration.seconds(5),
      environment: {
        USER_NAME: USER_NAME,
        USER_PASSWORD: USER_PASSWORD,
      }
    });
    
    // Expose the Lambda ARN as a public property
    this.basicAuthorizerArn = basicAuthorizerLambda.functionArn;

    // Output the ARN for reference with a specific ID
    new cdk.CfnOutput(this, 'BasicAuthorizerArnOutput', {
      value: this.basicAuthorizerArn,
      description: 'Basic Authorizer Lambda ARN',
      exportName: `basic-authorizer-${stage}`,
    });
  }
}
