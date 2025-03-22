#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NodejsAwsShopBeProductStack } from '../lib/nodejs-aws-shop-be-product-stack';
import { NodejsAwsShopBeImportStack } from '../lib/nodejs-aws-shop-be-import-stack';
import { NodejsAwsShopBeAuthorizationStack } from '../lib/nodejs-aws-shop-be-authorization-stack';

const app = new cdk.App();
const authStack = new NodejsAwsShopBeAuthorizationStack(app, 'rs-toy-shop-be-authorization-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-east-1',
  },
  stage: process.env.STAGE || 'dev',
  description: 'BE authorization stack for rs-school website',
});

new NodejsAwsShopBeProductStack(app, 'rs-toy-shop-be-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-east-1',
  },
  stage: process.env.STAGE || 'dev',
  description: 'BE product stack for rs-school website',
});

new NodejsAwsShopBeImportStack(app, 'rs-toy-shop-be-import-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-east-1',
  },
  stage: process.env.STAGE || 'dev',
  basicAuthorizerArn: authStack.basicAuthorizerArn,
  description: 'BE import stack for rs-school website',
});

