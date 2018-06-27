const { format } = require('util');
const test = require('ava');

const Axe = require('../lib');
const { beforeEach, afterEach } = require('./helpers');

const map = {
  log: 'log',
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warning: 'warn',
  warn: 'warn',
  err: 'stderr',
  error: 'stderr',
  fatal: 'stderr'
};

const levels = Object.keys(map);

test.beforeEach(beforeEach);
test.afterEach.always(afterEach);

test('returns itself', t => {
  t.true(t.context.axe instanceof Axe);
});

test('sets a config object', t => {
  t.true(t.context.axe instanceof Axe);
});

test(`returns array of levels`, t => {
  t.deepEqual(t.context.axe.config.levels, ['info', 'warn', 'error', 'fatal']);
});

levels.forEach(level => {
  test(`level ${level} works`, t => {
    const message = `test ${level} message`;
    t.context.axe[level](message);
    t.true(t.context[map[level]].calledWithMatch(message));
  });
});

levels.forEach(level => {
  test(`level ${level} works with meta`, t => {
    const message = `${level} works with meta`;
    t.context.axe[level](message, { user: { username: 'test' } });
    t.true(t.context[map[level]].calledWithMatch(message));
  });
});

levels.forEach(level => {
  test(`level ${level} works with Error as first argument`, t => {
    const axe = new Axe({ showStack: true, capture: false });
    const err = new Error(`test ${level} error`);
    axe[level](err);
    if (level === 'log') level = 'error';
    if (map[level] === 'stderr')
      t.true(t.context[map[level]].calledWithMatch(err.stack));
    else t.true(t.context[map[level]].calledWithMatch(err.message));
  });
});

levels.forEach(level => {
  test(`level ${level} allows four or more args`, t => {
    const args = ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'];
    t.context.axe[level](...args);
    const message = format(...args);
    t.true(t.context[map[level]].calledWithMatch(message));
  });
});

levels.forEach(level => {
  test(`level ${level} allows message using placeholder token`, t => {
    const args = ['arg1 %s hello world', 'arg2'];
    t.context.axe[level](...args);
    const message = format(...args);
    t.true(t.context[map[level]].calledWithMatch(message));
  });
});

levels.forEach(level => {
  test(`level ${level} converts a meta Array to String`, t => {
    const args = ['hello', [1, 2, 3]];
    t.context.axe[level](...args);
    const message = format(...args);
    t.true(t.context[map[level]].calledWithMatch(message));
  });
});

levels.forEach(level => {
  test(`level ${level} converts message to String if not one`, t => {
    t.context.axe[level](false);
    t.true(t.context[map[level]].calledWithMatch('false'));
  });
});

test('log can be used like console.log(message)', t => {
  t.context.axe.log('hello world');
  t.true(t.context.log.calledWithMatch('hello world'));
});

test('log can be used like console.log(message, meta)', t => {
  const message = 'hello world';
  t.context.axe.log(message, { user: { username: 'test' } });
  t.true(t.context.log.calledWithMatch(message));
});

test('log can be used with util.format', t => {
  const args = ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'];
  t.context.axe.log(...args);
  t.true(t.context.log.calledWithMatch(format(...args)));
});

test('log can be used with placeholder tokens', t => {
  const args = ['arg1 %s hello world', 'arg2'];
  const message = format(...args);
  t.context.axe.log(...args);
  t.true(t.context.log.calledWithMatch(message));
});
