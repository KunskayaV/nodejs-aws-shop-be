import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3n from 'aws-cdk-lib/aws-s3-notifications';
import { Construct } from 'constructs';
import * as path from 'path';

import * as dotenv from 'dotenv';
import { getLambdaBundlingBashCommand } from './helpers';
dotenv.config();

interface INodejsAwsShopBeImportStackProps extends cdk.StackProps {
  stage: string;
}

export class NodejsAwsShopBeImportStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: INodejsAwsShopBeImportStackProps) {
    super(scope, id, props);

    const stage = props?.stage || 'dev';
    const IMPORT_BUCKET_NAME = process.env.IMPORT_BUCKET_NAME || '';
    const IMPORT_BUCKET_PREFIX = process.env.IMPORT_BUCKET_PREFIX || '';
    const SQS_BASE_NAME = process.env.SQS_BASE_NAME || '';
    const SQS_PROCESSING_BATCH_SIZE = Number(process.env.SQS_PROCESSING_BATCH_SIZE) || 10;
    const SQS_NAME = `${SQS_BASE_NAME}-${stage}`;

    // Reference existing S3 bucket
    const importBucket = s3.Bucket.fromBucketName(
      this, 
      'ImportBucket',
      IMPORT_BUCKET_NAME
    );

    // Create Lambda functions
    const importProductsFileLambda = new lambda.Function(this, `import-products-file-lambda-${stage}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/import-service'), {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: getLambdaBundlingBashCommand('importProductsFile.js'),
        },
      }),
      handler: 'dist/handlers/importProductsFile.lambdaHandler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      environment: {
        IMPORT_BUCKET_NAME: IMPORT_BUCKET_NAME,
        IMPORT_BUCKET_PREFIX: IMPORT_BUCKET_PREFIX,
      }
    });

    importProductsFileLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ['s3:PutObject', 's3:GetObject'],
        resources: [`arn:aws:s3:::${IMPORT_BUCKET_NAME}/*`]
      })
    );

    const importFileParserLambda = new lambda.Function(this, `import-file-parser-lambda-${stage}`, {
      runtime: lambda.Runtime.NODEJS_18_X,
      code: lambda.Code.fromAsset(path.join(__dirname, '../../src/import-service'), {
        bundling: {
          image: lambda.Runtime.NODEJS_18_X.bundlingImage,
          command: getLambdaBundlingBashCommand('importFileParser.js'),
        },
      }),
      handler: 'dist/handlers/importFileParser.lambdaHandler',
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      environment: {
        IMPORT_BUCKET_NAME: IMPORT_BUCKET_NAME,
        IMPORT_BUCKET_PREFIX: IMPORT_BUCKET_PREFIX,
        SQS_NAME: SQS_NAME,
        SQS_PROCESSING_BATCH_SIZE: String(SQS_PROCESSING_BATCH_SIZE),
      }
    });

    // Add S3 permissions to importFileParserLambda
    importFileParserLambda.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:CopyObject',
          's3:ListBucket'
        ],
        resources: [
          `arn:aws:s3:::${IMPORT_BUCKET_NAME}`,
          `arn:aws:s3:::${IMPORT_BUCKET_NAME}/*`
        ]
      })
    );
    // Add S3 event notification for the folder for upload
    importBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.LambdaDestination(importFileParserLambda),
      {
        prefix: `${IMPORT_BUCKET_PREFIX}/`, // Only trigger for objects in the folder for upload
      }
    );

    // Add SQS permissions to importFileParserLambda
    importFileParserLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'sqs:SendMessage',
        'sqs:SendMessageBatch',
        'sqs:GetQueueUrl',
      ],
      resources: [`arn:aws:sqs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:${SQS_NAME}`]
    }));

    // Create API Gateway
    const api = new apigateway.RestApi(this, `import-api-${stage}`, {
      restApiName: 'Import Service',
      description: 'This is the import service API',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: stage // Use the stage variable for the API Gateway stage
      }
    });

    // Create API resources and methods
    const products = api.root.addResource('import');
    // Add request validator
    const validator = new apigateway.RequestValidator(this, 'ImportRequestValidator', {
      restApi: api,
      validateRequestParameters: true,
    });
    // GET /products
    products.addMethod('GET', new apigateway.LambdaIntegration(importProductsFileLambda, {
      proxy: true,
      requestParameters: {
        'integration.request.querystring.name': 'method.request.querystring.name'
      },
      // Configure request handling
      requestTemplates: {
        'application/json': JSON.stringify({ statusCode: 200 }),
      },
    }), {
      requestParameters: {
        'method.request.querystring.name': true, // This makes the 'name' parameter required
      },
      requestValidator: validator
    });


    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
}
