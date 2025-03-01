import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import * as path from 'path';

import * as dotenv from 'dotenv';
import { getLambdaBundlingBashCommand } from './helpers';
dotenv.config();

interface INodejsAwsShopBeStackProps extends cdk.StackProps {
  stage: string;
}

export class NodejsAwsShopBeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: INodejsAwsShopBeStackProps) {
    super(scope, id, props);

    const stage = props?.stage || 'dev'; 

    const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME || '';
    const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME || '';

    // Create Lambda functions
    const getProductsListLambda = new lambda.Function(this, `get-products-list-lambda-${stage}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/product-service'), {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: getLambdaBundlingBashCommand('getProductsList.js'),
        },
      }),
      handler: 'dist/handlers/getProductsList.lambdaHandler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      environment: {
        PRODUCT_TABLE_NAME: PRODUCT_TABLE_NAME,
        STOCK_TABLE_NAME: STOCK_TABLE_NAME,
      }
    });

    const getProductByIdLambda = new lambda.Function(this, `get-product-by-id-${stage}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/product-service'), {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: getLambdaBundlingBashCommand('getProductById.js'),
        },
      }),
      handler: 'dist/handlers/getProductById.lambdaHandler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      environment: {
        PRODUCT_TABLE_NAME: PRODUCT_TABLE_NAME,
        STOCK_TABLE_NAME: STOCK_TABLE_NAME,
      }
    });

    const createProductLambda = new lambda.Function(this, `create-new-product-${stage}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/product-service'), {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: getLambdaBundlingBashCommand('createNewProduct.js'),
        },
      }),
      handler: 'dist/handlers/createNewProduct.lambdaHandler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      environment: {
        PRODUCT_TABLE_NAME: PRODUCT_TABLE_NAME,
        STOCK_TABLE_NAME: STOCK_TABLE_NAME,
      }
    });

    const dynamoDBProductsListPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:Scan',
      ],
      resources: [
        `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${PRODUCT_TABLE_NAME}`,
        `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${STOCK_TABLE_NAME}`
      ]
    });

    const dynamoDBProductByIdPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
      ],
      resources: [
        `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${PRODUCT_TABLE_NAME}`,
        `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${STOCK_TABLE_NAME}`
      ]
    });
    const dynamoDBCreateProductPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'dynamodb:GetItem',
        "dynamodb:PutItem",
        "dynamodb:ConditionCheckItem",
      ],
      resources: [
        `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${PRODUCT_TABLE_NAME}`,
        `arn:aws:dynamodb:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:table/${STOCK_TABLE_NAME}`
      ]
    });

    getProductsListLambda.addToRolePolicy(dynamoDBProductsListPolicy);
    getProductByIdLambda.addToRolePolicy(dynamoDBProductByIdPolicy);
    createProductLambda.addToRolePolicy(dynamoDBCreateProductPolicy);

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
    // GET /products
    products.addMethod('GET', new apigateway.LambdaIntegration(getProductsListLambda, {
      proxy: true,
      // Configure request handling
      requestTemplates: {
        'application/json': JSON.stringify({ statusCode: 200 }),
      },
    }));

    // POST /products
    products.addMethod('POST', new apigateway.LambdaIntegration(createProductLambda, {
      proxy: true,
      requestTemplates: {
        'application/json': JSON.stringify({ statusCode: 200 }),
      },
    }));

    // GET /products/{productId}
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
