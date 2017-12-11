const { format } = require('util');
const test = require('ava');

const Logger = require('../');
const { beforeEach, afterEach } = require('./helpers');

test.beforeEach(beforeEach);
test.afterEach.always(afterEach);

test('returns itself', t => {
  t.true(t.context.logger instanceof Logger);
});

test('sets a config object', t => {
  t.true(t.context.logger instanceof Logger);
});

test(`returns array of levels`, t => {
  t.deepEqual(Logger.levels, ['debug', 'info', 'warning', 'error', 'fatal']);
});

Logger.levels.forEach(level => {
  test(`level ${level} works`, t => {
    const message = `test ${level} message`;
    t.context.logger[level](message);
    if (level === 'debug') t.true(t.context.stderr.calledWithMatch(message));
    else t.true(t.context.spy.calledWithMatch(message));
  });
});

Logger.levels.forEach(level => {
  test(`level ${level} works with meta`, t => {
    const message = `${level} works with meta`;
    t.context.logger[level](message, { user: { username: 'test' } });
    if (level === 'debug') {
      t.true(t.context.stderr.calledWithMatch(message));
    } else {
      t.true(t.context.spy.calledWithMatch(message));
      t.true(t.context.spy.calledWith({ user: { username: 'test' } }));
    }
  });
});

Logger.levels.forEach(level => {
  test(`level ${level} works with Error as first argument`, t => {
    const logger = new Logger({ showStack: true, processName: 'ava-tests' });
    const err = new Error(`test ${level} error`);
    logger[level](err);
    // TODO: t.true(t.context.spy.calledWith(err.stack));
    if (level === 'debug')
      t.true(t.context.stderr.calledWithMatch(err.message));
    else t.true(t.context.spy.calledWithMatch(err.message));
  });
});

Logger.levels.forEach(level => {
  test(`level ${level} allows four or more args`, t => {
    const args = ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'];
    t.context.logger[level](...args);
    const message = format(...args);
    if (level === 'debug') t.true(t.context.stderr.calledWithMatch(message));
    else t.true(t.context.spy.calledWithMatch(message));
  });
});

Logger.levels.forEach(level => {
  test(`level ${level} allows message using placeholder token`, t => {
    const args = ['arg1 %s hello world', 'arg2'];
    t.context.logger[level](...args);
    const message = format(...args);
    if (level === 'debug') t.true(t.context.stderr.calledWithMatch(message));
    else t.true(t.context.spy.calledWithMatch(message));
  });
});

Logger.levels.forEach(level => {
  test(`level ${level} converts a meta Array to String`, t => {
    const args = ['hello', [1, 2, 3]];
    t.context.logger[level](...args);
    const message = format(...args);
    if (level === 'debug') t.true(t.context.stderr.calledWithMatch(message));
    else t.true(t.context.spy.calledWithMatch(message));
  });
});

Logger.levels.forEach(level => {
  test(`level ${level} converts message to String if not one`, t => {
    t.context.logger[level](false);
    if (level === 'debug') t.true(t.context.stderr.calledWithMatch('false'));
    else t.true(t.context.spy.calledWithMatch('false'));
  });
});
