const test = require('ava');
const _ = require('lodash');

const Script = require('../');
const { beforeEach, afterEach } = require('./helpers');

test.beforeEach(beforeEach);
test.afterEach(afterEach);

test('returns itself', t => {
  t.true(t.context.script instanceof Script);
});

test('sets a config object', t => {
  const script = new Script();
  t.true(script instanceof Script);
});

test(`returns array of levels`, t => {
  t.deepEqual(Script.levels, ['debug', 'info', 'warning', 'error', 'fatal']);
});

// TODO: We need to spy on the console to check output
//
// debug: test message
// info: test message
// warning: test message
// error: test message
// fatal: test message
test.failing(`all levels work`, t => {
  const script = new Script();
  _.each(Script.levels, level => {
    t.is(script[level]('test message'), `${level}: test message`);
  });
});

// TODO: Same as above with meta
test.failing(`all levels work with meta`, t => {
  const script = new Script({ showStack: true });
  _.each(Script.levels, level => {
    t.is(
      script[level]('test message', { user: { username: 'test' } }),
      `${level}: test message`
    );
  });
});

// TODO: Same as above with extra
test.failing(`all levels work with extra`, t => {
  const script = new Script({ showStack: true });
  _.each(Script.levels, level => {
    t.is(
      script[level]('test message', { extra: 'test' }),
      `${level}: test message`
    );
  });
});

// TODO: Same as above with an Error object
test.failing(`all levels work with Error`, t => {
  const script = new Script({ showStack: true });
  _.each(Script.levels, level => {
    t.is(script[level](new Error('test error')), `${level}: test message`);
  });
});
