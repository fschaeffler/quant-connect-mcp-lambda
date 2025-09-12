#!/usr/bin/env node
import { App } from 'aws-cdk-lib'
import 'source-map-support/register'
import { QuantConnectMCPStack } from '../lib/quant-connect-mcp'

const app = new App()

new QuantConnectMCPStack(app, 'QuantConnectMCPStack')
