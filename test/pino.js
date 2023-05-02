const test = require('ava');
const pino = require('pino');
const tests = require('./helpers/tests');

tests(test, pino());
