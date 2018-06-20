const { format } = require('util');
const test = require('ava');

const Axe = require('../lib');
const { beforeEach, afterEach } = require('./helpers');

test.beforeEach(beforeEach);
test.afterEach.always(afterEach);

test('returns itself', t => {
  t.true(t.context.axe instanceof Axe);
});

test('sets a config object', t => {
  t.true(t.context.axe instanceof Axe);
});

test(`returns array of levels`, t => {
  t.deepEqual(Axe.levels, ['debug', 'info', 'warning', 'error', 'fatal']);
});

Axe.levels.forEach(level => {
  test(`level ${level} works`, t => {
    const message = `test ${level} message`;
    t.context.axe[level](message);
    console.log('getCalls', t.context.stderr.getCalls());
    if (level === 'debug') t.true(t.context.stderr.calledWithMatch(message));
    else t.true(t.context.spy.calledWithMatch(message));
  });
});

Axe.levels.forEach(level => {
  test(`level ${level} works with meta`, t => {
    const message = `${level} works with meta`;
    t.context.axe[level](message, { user: { username: 'test' } });
    console.log('spy getCalls', t.context.spy.getCalls());
    console.log('stderr getCalls', t.context.stderr.getCalls());
    if (level === 'debug') {
      t.true(t.context.stderr.calledWithMatch(message));
    } else {
      t.true(t.context.spy.calledWithMatch(message));
      t.true(t.context.spy.calledWith({ user: { username: 'test' } }));
    }
  });
});

Axe.levels.forEach(level => {
  test(`level ${level} works with Error as first argument`, t => {
    const axe = new Axe({ showStack: true, processName: 'ava-tests' });
    const err = new Error(`test ${level} error`);
    axe[level](err);
    console.log('spy getCalls', t.context.spy.getCalls());
    console.log('stderr getCalls', t.context.stderr.getCalls());
    // TODO: t.true(t.context.spy.calledWith(err.stack));
    if (level === 'debug')
      t.true(t.context.stderr.calledWithMatch(err.message));
    else t.true(t.context.spy.calledWithMatch(err.message));
  });
});

Axe.levels.forEach(level => {
  test(`level ${level} allows four or more args`, t => {
    const args = ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'];
    t.context.axe[level](...args);
    const message = format(...args);
    if (level === 'debug') t.true(t.context.stderr.calledWithMatch(message));
    else t.true(t.context.spy.calledWithMatch(message));
  });
});

Axe.levels.forEach(level => {
  test(`level ${level} allows message using placeholder token`, t => {
    const args = ['arg1 %s hello world', 'arg2'];
    t.context.axe[level](...args);
    const message = format(...args);
    if (level === 'debug') t.true(t.context.stderr.calledWithMatch(message));
    else t.true(t.context.spy.calledWithMatch(message));
  });
});

Axe.levels.forEach(level => {
  test(`level ${level} converts a meta Array to String`, t => {
    const args = ['hello', [1, 2, 3]];
    t.context.axe[level](...args);
    const message = format(...args);
    if (level === 'debug') t.true(t.context.stderr.calledWithMatch(message));
    else t.true(t.context.spy.calledWithMatch(message));
  });
});

Axe.levels.forEach(level => {
  test(`level ${level} converts message to String if not one`, t => {
    t.context.axe[level](false);
    if (level === 'debug') t.true(t.context.stderr.calledWithMatch('false'));
    else t.true(t.context.spy.calledWithMatch('false'));
  });
});

test('log can be used like console.log(message)', t => {
  t.context.axe.log('hello world');
  t.true(t.context.spy.calledWithMatch('hello world'));
});

test('log can be used like console.log(message, meta)', t => {
  const message = 'hello world';
  t.context.axe.log(message, { user: { username: 'test' } });
  t.true(t.context.spy.calledWithMatch(message));
  t.true(t.context.spy.calledWith({ user: { username: 'test' } }));
});

test('log can be used with util.format', t => {
  const args = ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'];
  t.context.axe.log(...args);
  t.true(t.context.spy.calledWithMatch(format(...args)));
});

test('log can be used with placeholder tokens', t => {
  const args = ['arg1 %s hello world', 'arg2'];
  const message = format(...args);
  t.context.axe.log(...args);
  t.true(t.context.spy.calledWithMatch(message));
});
