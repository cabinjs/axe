const { format } = require('node:util');
const sinon = require('sinon');
const parseErr = require('parse-err');

const Axe = require('../../lib');
const beforeEach = require('./before-each');
const afterEach = require('./after-each');

const silentSymbol = Symbol.for('axe.silent');

const map = {
  log: 'log',
  trace: 'trace',
  debug: 'debug',
  info: 'info',
  warning: 'warn',
  warn: 'warn',
  err: 'error',
  error: 'error',
  fatal: 'fatal'
};

module.exports = (test, logger = console) => {
  const { name } = logger.constructor;
  const levels = Object.keys(map).filter((level) => logger[level]);

  test.beforeEach(beforeEach(logger));
  test.afterEach.always(afterEach);

  test(`${name} returns itself`, (t) => {
    t.true(t.context.axe instanceof Axe);
  });

  test(`${name} sets a config object`, (t) => {
    t.true(t.context.axe instanceof Axe);
  });

  test(`${name} sets the logger`, (t) => {
    t.true(t.context.axe.config.logger === logger);
  });

  test(`${name} returns a set level of trace`, (t) => {
    t.is(t.context.axe.config.level, 'trace');
  });

  test(`${name} returns a set array of levels`, (t) => {
    t.deepEqual(t.context.axe.config.levels, [
      'trace',
      'debug',
      'info',
      'warn',
      'error',
      'fatal'
    ]);
  });

  for (const level of levels) {
    test(`${name} level ${level} works`, (t) => {
      t.context.axe[level](`test ${level} message`);
      t.deepEqual(t.context[map[level]].getCall(0).args, [
        `test ${level} message`
      ]);
    });

    test(`${name} level ${level} works with meta`, (t) => {
      const message = `${level} works with meta`;
      t.context.axe[level](message, { user: { username: 'test' } });
      t.true(t.context[map[level]].calledWithMatch(message));
    });

    test(`${name} level ${level} works with meta silent symbol`, (t) => {
      const message = `${level} works with meta silent symbol`;
      t.context.axe[level](message, {
        foo: 'bar',
        user: { username: 'test' },
        [silentSymbol]: true
      });
      t.false(t.context[map[level]].calledWithMatch(message));
    });

    test(`${name} level ${level} works with meta and meta.show option`, (t) => {
      const message = `${level} works with meta`;
      const meta = { user: { username: 'test' } };
      t.context.axe[level](message, meta);
      t.true(
        t.context[map[level]].calledWith(
          message,
          sinon.match({
            user: {
              username: `test`
            }
          })
        )
      );
    });

    test(`${name} level ${level} works with meta.is_http and meta hideHTTP option`, (t) => {
      const message = `${level} works with meta.is_http and meta hideHTTP option`;
      const meta = { is_http: true, user: { username: 'test' } };
      t.context.axe[level](message, meta);
      t.true(t.context[map[level]].calledWith(message));
    });

    test(`${name} level ${level} works with undefined message`, (t) => {
      t.context.axe[level]();
      t.true(
        t.context[map[level]].calledWith(
          t.context.axe.getNormalizedLevel(level)
        )
      );
    });

    test(`${name} level ${level} works with Object as first argument`, (t) => {
      const message = { test: 'message' };
      t.context.axe[level](message);
      t.true(
        t.context[map[level]].calledWith(
          t.context.axe.getNormalizedLevel(level),
          sinon.match({ message })
        )
      );
    });

    test(`${name} level ${level} works with Array as first argument`, (t) => {
      const message = [1, 2, 3];
      t.context.axe[level](message);
      t.true(
        t.context[map[level]].calledWith(
          t.context.axe.getNormalizedLevel(level),
          sinon.match({ message })
        )
      );
    });

    test(`${name} level ${level} works with Bunyan-style (meta, message)`, (t) => {
      const message = `${level} works with meta`;
      const meta = { user: { username: 'test' } };
      t.context.axe[level](meta, message);
      t.true(
        t.context[map[level]].calledWith(
          message,
          sinon.match({
            user: {
              username: `test`
            }
          })
        )
      );
    });

    test(`${name} level ${level} works with Bunyan-style (meta, message, ...args) with format specifiers`, (t) => {
      const message = `${level} works with meta %s and %d %d %d`;
      const meta = { user: { username: 'test' } };
      t.context.axe[level](meta, message, 'foo', 5, 6, 8);
      const string = format(message, 'foo', 5, 6, 8);
      t.true(
        t.context[map[level]].calledWith(
          string,
          sinon.match({
            user: {
              username: `test`
            }
          })
        )
      );
    });

    test(`${name} level ${level} works with Bunyan-style (meta, message, arg) with format specifiers`, (t) => {
      const message = `${level} works with meta %s`;
      const meta = { user: { username: 'test' } };
      t.context.axe[level](meta, message, 'foo');
      const string = format(message, 'foo');
      t.true(
        t.context[map[level]].calledWith(
          string,
          sinon.match({
            user: {
              username: `test`
            }
          })
        )
      );
    });

    test(`${name} level ${level} works with Error as first argument`, (t) => {
      const error = new Error(`test ${level} error`);
      t.context.axe[level](error);
      const _level = level === 'log' ? 'error' : level;
      t.true(
        t.context[map[_level]].calledWith(
          sinon.match
            .instanceOf(Error)
            .and(sinon.match.has('name', error.name))
            .and(sinon.match.has('message', error.message))
        )
      );
    });

    test(`${name} level ${level} allows four or more args`, (t) => {
      const args = ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'];
      t.context.axe[level](...args);
      const message = format(...args);
      t.true(t.context[map[level]].calledWithMatch(message));
    });

    test(`${name} level ${level} allows message using placeholder token`, (t) => {
      const args = ['arg1 %s hello world', 'arg2'];
      t.context.axe[level](...args);
      const message = format(...args);
      t.true(t.context[map[level]].calledWithMatch(message));
    });

    test(`${name} level ${level} converts a meta Array to String`, (t) => {
      const args = ['hello', [1, 2, 3]];
      t.context.axe[level](...args);
      const message = format(...args);
      t.true(t.context[map[level]].calledWithMatch(message));
    });

    test(`${name} level ${level} preserves message if not String`, (t) => {
      t.context.axe[level](false);
      t.true(
        t.context[map[level]].calledWith(
          t.context.axe.getNormalizedLevel(level),
          sinon.match({ message: false })
        )
      );
    });

    test(`${name} level ${level} pre hook from config`, (t) => {
      t.context.axe[level]('test prehookconfig');
      t.true(
        t.context[map[level]].calledWithMatch(`test ${level}prehookconfig`)
      );
    });

    test(`${name} level ${level} post hook from config`, async (t) => {
      t.context[`${level}PostConfigTest`] = [];
      t.context.axe[level]('test posthookconfig');
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      t.is(t.context[`${level}PostConfigTest`][1], 'test posthookconfig');
    });

    test(`${name} level ${level} pre hook`, (t) => {
      t.context.axe[level]('test prehookadded');
      t.true(
        t.context[map[level]].calledWithMatch(`test ${level}prehookadded`)
      );
    });

    test(`${name} level ${level} post hook`, async (t) => {
      t.context[`${level}PostTest`] = [];
      t.context.axe[level]('test post hook');
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
      t.is(t.context[`${level}PostTest`][1], 'test post hook');
    });

    test(`${name} level ${level} post hook with await`, async (t) => {
      t.context[`${level}PostTest`] = [];
      const result = await t.context.axe[level]('test post hook');
      t.deepEqual(result[0], {
        method: level,
        err: undefined,
        message: 'test post hook',
        meta: {}
      });
      t.is(t.context[`${level}PostTest`][1], 'test post hook');
    });

    test(`${name} level ${level} combined error with 2 args`, (t) => {
      t.context.axe[level](new Error('hmm'), new Error('oops'));
      const _level = level === 'log' ? 'error' : level;
      t.is(t.context[map[_level]].getCall(0).args[0].message, 'hmm; oops');
    });

    test(`${name} level ${level} combined error with message and meta.err`, (t) => {
      const err = new Error('oops');
      t.context.axe[level](new Error('hmm'), { err });
      const _level = level === 'log' ? 'error' : level;
      t.is(t.context[map[_level]].getCall(0).args[0].message, 'hmm; oops');
      t.deepEqual(
        t.context[map[_level]].getCall(0).args[1].original_err,
        parseErr(err)
      );
    });

    test(`${name} level ${level} combined error with message (err), meta (err), and 1 additional arg`, (t) => {
      const err = new Error('oops');
      t.context.axe[level](new Error('hmm'), new Error('uh oh'), { err });
      const _level = level === 'log' ? 'error' : level;
      t.is(t.context[map[_level]].getCall(0).args[0].message, 'hmm; uh oh');
      t.is(t.context[map[_level]].getCall(0).args[1], undefined);
    });

    test(`${name} level ${level} combined error with message and 3 additional arg`, (t) => {
      t.context.axe[level](
        new Error('hmm'),
        new Error('uh oh'),
        new Error('foo bar'),
        new Error('oops')
      );
      const _level = level === 'log' ? 'error' : level;
      t.is(
        t.context[map[_level]].getCall(0).args[0].message,
        'hmm; uh oh; foo bar; oops'
      );
    });

    test(`${name} level ${level} combined error with 3 args`, (t) => {
      t.context.axe[level](
        new Error('hmm'),
        new Error('uh oh'),
        new Error('foo bar')
      );
      const _level = level === 'log' ? 'error' : level;
      t.is(
        t.context[map[_level]].getCall(0).args[0].message,
        'hmm; uh oh; foo bar'
      );
    });

    test(`${name} level ${level} combined error with 3 args and message first`, (t) => {
      t.context.axe[level]('hmm', new Error('uh oh'), new Error('foo bar'));
      t.is(t.context[map[level]].getCall(0).args[0].message, 'uh oh; foo bar');
    });

    test(`${name} level ${level} combined error with 4 args`, (t) => {
      t.context.axe[level](
        new Error('hmm'),
        new Error('uh oh'),
        new Error('foo bar'),
        new Error('beep')
      );
      const _level = level === 'log' ? 'error' : level;
      t.is(
        t.context[map[_level]].getCall(0).args[0].message,
        'hmm; uh oh; foo bar; beep'
      );
    });

    test(`${name} level ${level} combined error with 4 args and message is not an error`, (t) => {
      t.context.axe[level](
        'hmm',
        new Error('uh oh'),
        new Error('foo bar'),
        new Error('beep')
      );
      t.is(
        t.context[map[level]].getCall(0).args[0].message,
        'uh oh; foo bar; beep'
      );
    });

    test(`${name} level ${level} combined error with 5 args`, (t) => {
      t.context.axe[level](
        new Error('hmm'),
        new Error('uh oh'),
        new Error('foo bar'),
        new Error('beep'),
        new Error('boop')
      );
      const _level = level === 'log' ? 'error' : level;
      t.is(
        t.context[map[_level]].getCall(0).args[0].message,
        'hmm; uh oh; foo bar; beep; boop'
      );
    });

    test(`${name} level ${level} works with remappedFields`, (t) => {
      t.context.axe[level]('test', {
        remap: {
          field: true
        }
      });
      t.true(
        t.context[map[level]].calledWith(
          'test',
          sinon.match({ remappedField: true })
        )
      );
    });

    test(`${name} level ${level} works with omittedFields`, (t) => {
      t.context.axe[level]('test', {
        beep: true
      });
      t.true(
        t.context[map[level]].calledWith(
          'test'
          // nothing here because it's empty
        )
      );
    });

    test(`${name} level ${level} works with pickedFields`, (t) => {
      t.context.axe[level]('test', {
        foo: {
          beep: true,
          bar: true
        }
      });
      t.true(
        t.context[map[level]].calledWith('test', {
          foo: {
            bar: true
          }
        })
      );
    });

    test(`${name} level ${level} works with omittedFields and pickedFields`, (t) => {
      t.context.axe[level]('test', {
        request: {
          timestamp: 1,
          headers: {
            'X-Test': true
          }
        }
      });
      t.true(
        t.context[map[level]].calledWith('test', {
          request: {
            headers: {
              'X-Test': true
            }
          }
        })
      );
    });
  }

  if (levels.includes('log')) {
    test(`${name} log can be used like console.log(message)`, (t) => {
      t.context.axe.log('hello world');
      t.true(t.context.log.calledWithMatch('hello world'));
    });

    test(`${name} log can be used like console.log(message, meta)`, (t) => {
      const message = 'hello world';
      t.context.axe.log(message, { user: { username: 'test' } });
      t.true(t.context.log.calledWithMatch(message));
    });

    test(`${name} log can be used with util.format`, (t) => {
      const args = ['arg1', 'arg2', 'arg3', 'arg4', 'arg5'];
      t.context.axe.log(...args);
      t.true(t.context.log.calledWithMatch(format(...args)));
    });

    test(`${name} log can be used with placeholder tokens`, (t) => {
      const args = ['arg1 %s hello world', 'arg2'];
      const message = format(...args);
      t.context.axe.log(...args);
      t.true(t.context.log.calledWithMatch(message));
    });
  }
};
