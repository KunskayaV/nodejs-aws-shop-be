import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as eventsources from 'aws-cdk-lib/aws-lambda-event-sources';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as sns from 'aws-cdk-lib/aws-sns';
import * as subscriptions from 'aws-cdk-lib/aws-sns-subscriptions';

import { Construct } from 'constructs';
import * as path from 'path';
import * as dotenv from 'dotenv';

import { getLambdaBundlingBashCommand } from './helpers';
dotenv.config();

interface INodejsAwsShopBeProductStackProps extends cdk.StackProps {
  stage: string;
}

export class NodejsAwsShopBeProductStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: INodejsAwsShopBeProductStackProps) {
    super(scope, id, props);

    const stage = props?.stage || 'dev'; 

    const PRODUCT_TABLE_NAME = process.env.PRODUCT_TABLE_NAME || '';
    const STOCK_TABLE_NAME = process.env.STOCK_TABLE_NAME || '';
    const SQS_BASE_NAME = process.env.SQS_BASE_NAME || '';
    const SQS_PROCESSING_BATCH_SIZE = Number(process.env.SQS_PROCESSING_BATCH_SIZE) || 10;
    const SNS_EXPENSIVE_PRODUCT_SUBSCRIPTION_EMAIL = process.env.SNS_EXPENSIVE_PRODUCT_SUBSCRIPTION_EMAIL || '';
    const SNS_REGULAR_PRODUCT_SUBSCRIPTION_EMAIL = process.env.SNS_REGULAR_PRODUCT_SUBSCRIPTION_EMAIL || '';
    const BASE_PRODUCT_PRICE = Number(process.env.BASE_PRODUCT_PRICE) || 0;

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


    // Create SQS Queue
    const catalogItemsQueue = new sqs.Queue(this, `${SQS_BASE_NAME}-${stage}`, {
      queueName: `rs-toy-shop-catalog-items-queue-${stage}`,
      visibilityTimeout: cdk.Duration.seconds(30), // Should be greater than lambda timeout
      receiveMessageWaitTime: cdk.Duration.seconds(10) // Enable long polling, max is 20 seconds
    });

    // Create SNS Topic
    const createProductTopic = new sns.Topic(this, `rs-toy-shop-create-product-topic-${stage}`, {
      topicName: `rs-toy-shop-create-product-topic-${stage}`,
    });

    // Add email subscription for expensive products (price >= BASE_PRODUCT_PRICE)
    createProductTopic.addSubscription(
      new subscriptions.EmailSubscription(SNS_EXPENSIVE_PRODUCT_SUBSCRIPTION_EMAIL, {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            greaterThanOrEqualTo: BASE_PRODUCT_PRICE
          })
        }
      })
    );

    // Add email subscription for inexpensive products (price < BASE_PRODUCT_PRICE)
    createProductTopic.addSubscription(
      new subscriptions.EmailSubscription(SNS_REGULAR_PRODUCT_SUBSCRIPTION_EMAIL, {
        filterPolicy: {
          price: sns.SubscriptionFilter.numericFilter({
            lessThan: BASE_PRODUCT_PRICE
          })
        }
      })
    );


    // Create Lambda for processing SQS messages
    const catalogBatchProcessLambda = new lambda.Function(this, `catalog-batch-process-${stage}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/product-service'), {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: getLambdaBundlingBashCommand('catalogBatchProcess.js'),
        },
      }),
      handler: 'dist/handlers/catalogBatchProcess.lambdaHandler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(20),
      environment: {
        PRODUCT_TABLE_NAME: PRODUCT_TABLE_NAME,
        STOCK_TABLE_NAME: STOCK_TABLE_NAME,
        SNS_TOPIC_ARN: createProductTopic.topicArn
      }
    });

    // Add SQS trigger to Lambda
    catalogBatchProcessLambda.addEventSource(
      new eventsources.SqsEventSource(catalogItemsQueue, {
        batchSize: SQS_PROCESSING_BATCH_SIZE,
        enabled: true,
        maxBatchingWindow: cdk.Duration.seconds(10), // Maximum time to gather messages before invoking lambda
        maxConcurrency: 2,
        reportBatchItemFailures: true,
      })
    );

    // Add required permissions
    const sqsPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sqs:ReceiveMessage',
        'sqs:DeleteMessage',
        'sqs:GetQueueAttributes'
      ],
      resources: [catalogItemsQueue.queueArn]
    });

    // Add SNS publish permissions to Lambda
    const snsPublishPolicy = new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['sns:Publish'],
      resources: [createProductTopic.topicArn]
    });

    catalogBatchProcessLambda.addToRolePolicy(sqsPolicy);
    catalogBatchProcessLambda.addToRolePolicy(snsPublishPolicy);
    catalogBatchProcessLambda.addToRolePolicy(dynamoDBCreateProductPolicy);

  
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
