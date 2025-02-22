import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import * as path from 'path';

interface INodejsAwsShopBeStackProps extends cdk.StackProps {
  stage: string;
}

export class NodejsAwsShopBeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: INodejsAwsShopBeStackProps) {
    super(scope, id, props);

    const stage = props?.stage || 'dev'; 

    // Create Lambda functions
    const getProductsListLambda = new lambda.Function(this, `get-products-list-lambda-${stage}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../build/product-service')),
      handler: 'getProductsList.handler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
    });

    const getProductByIdLambda = new lambda.Function(this, `get-product-by-id-${stage}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../build/product-service')),
      handler: 'getProductById.handler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, `products-api-${stage}`, {
      restApiName: 'Products Service',
      description: 'This is the products service API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: stage // Use the stage variable for the API Gateway stage
      }
    });

    // Create API resources and methods
    const products = api.root.addResource('products');
    products.addMethod('GET', new apigateway.LambdaIntegration(getProductsListLambda, {
      proxy: true,
      // Configure request handling
      requestTemplates: {
        'application/json': JSON.stringify({ statusCode: 200 }),
      },
    }));

    const product = products.addResource('{productId}');
    product.addMethod('GET', new apigateway.LambdaIntegration(getProductByIdLambda, {
      proxy: true,
      requestTemplates: {
        'application/json': JSON.stringify({ statusCode: 200 }),
      },
    }));

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
}
