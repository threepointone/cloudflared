#!/usr/bin/env node
import { startHelloWorldServer } from './hello/server.js';

const address = process.env.ADDRESS || 'localhost:';
startHelloWorldServer({ address });
