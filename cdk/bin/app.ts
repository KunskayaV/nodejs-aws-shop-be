#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { NodejsAwsShopBeStack } from '../lib/nodejs-aws-shop-be-stack';

const app = new cdk.App();
new NodejsAwsShopBeStack(app, 'rs-toy-shop-be-stack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'eu-east-1',
  },
  stage: process.env.STAGE || 'dev',
  description: 'BE stack for rs-school website',
});