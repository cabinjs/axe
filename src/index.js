const format = require('format-util');
const superagent = require('superagent');
const parseErr = require('parse-err');
const safeStringify = require('fast-safe-stringify');
// <https://lacke.mn/reduce-your-bundle-js-file-size/>
// <https://github.com/lodash/babel-plugin-lodash/issues/221>
const isError = require('lodash/isError');
const isObject = require('lodash/isObject');
const isString = require('lodash/isString');
const includes = require('lodash/includes');
const omit = require('lodash/omit');
const isEmpty = require('lodash/isEmpty');
const isPlainObject = require('lodash/isPlainObject');
const isUndefined = require('lodash/isUndefined');
const isNull = require('lodash/isNull');

// add retry logic to superagent
require('superagent-retry')(superagent);

// eslint-disable-next-line import/no-unassigned-import
require('console-polyfill');

// these are known as "placeholder tokens", see this link for more info:
// <https://nodejs.org/api/util.html#util_util_format_format_args>
//
// since they aren't exposed (or don't seem to be) by node (at least not yet)
// we just define an array that contains them for now
// <https://github.com/nodejs/node/issues/17601>
const tokens = ['%s', '%d', '%i', '%f', '%j', '%o', '%O', '%%'];
const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const endpoint = 'https://api.cabinjs.com';
const env = process.env.NODE_ENV || 'development';

class Axe {
  constructor(config = {}) {
    this.config = Object.assign(
      {
        key: '',
        endpoint,
        headers: {},
        timeout: 5000,
        retry: 3,
        showStack: true,
        showMeta: true,
        silent: false,
        logger: console,
        levels: ['info', 'warn', 'error', 'fatal'],
        capture: env === 'production'
      },
      config
    );

    Object.assign(this, omit(this.config.logger, ['config', 'log']));

    // we could have used `auto-bind` but it's not compiled for browser
    this.log = this.log.bind(this);

    // bind helper functions for each log level
    levels.forEach(level => {
      this[level] = (...args) =>
        this.log(...[level].concat([].slice.call(args)));
    });

    // aliases
    this.err = this.error;
    this.warning = this.warn;
  }

  // eslint-disable-next-line complexity
  log(level, message, meta = {}, ...args) {
    const originalArgs = [level, message, meta, ...[].slice.call(args)];
    const { config } = this;
    let modifier = 0;

    if (level === 'warning') level = 'warn';
    if (level === 'err') level = 'error';

    if (isError(level)) {
      meta = message;
      message = level;
      level = 'error';
    } else if (!isString(level) || !includes(levels, level)) {
      meta = message;
      message = level;
      level = 'info';
      modifier = -1;
    }

    // if there are four or more args
    // then infer to use util.format on everything
    if (arguments.length >= 4 + modifier) {
      message = format(...originalArgs.slice(1 + modifier));
      meta = {};
    } else if (
      arguments.length === 3 + modifier &&
      isString(message) &&
      tokens.some(t => includes(message, t))
    ) {
      // otherwise if there are three args and if the `message` contains
      // a placeholder token (e.g. '%s' or '%d' - see above `tokens` variable)
      // then we can infer that the `meta` arg passed is used for formatting
      message = format(message, meta);
      meta = {};
    } else if (!isError(message)) {
      if (isError(meta)) {
        meta = { err: parseErr(meta) };
      } else if (!isPlainObject(meta) && !isUndefined(meta) && !isNull(meta)) {
        // if the `meta` variable passed was not an Object then convert it
        message = format(message, meta);
        meta = {};
      } else if (!isString(message)) {
        // if the message is not a string then we should run `util.format` on it
        // assuming we're formatting it like it was another argument
        // (as opposed to using something like fast-json-stringify)
        message = format(message);
      }
    }

    if (!isPlainObject(meta)) meta = {};

    let err;
    if (isError(message)) {
      err = message;
      if (!isObject(meta.err)) meta.err = parseErr(err);
      ({ message } = message);
    }

    // set default level on meta
    meta.level = level;

    // set the body used for returning with and sending logs
    // (and also remove circular references)
    const body = safeStringify({ message, meta });

    // send to Cabin or other logging service here the `message` and `meta`
    if (
      config.capture &&
      includes(config.levels, level) &&
      (!isError(err) || !err._captureFailed)
    ) {
      // if the user didn't specify a key
      // and they are using the default endpoint
      // then we should throw an error to them
      if (config.endpoint === endpoint && !config.key)
        throw new Error(
          "Please provide your Cabin API key as `new Axe({ key: 'YOUR-CABIN-API-KEY' })`.\nVisit <https://cabinjs.com> to sign up for free!\nHide this message with `new Axe({ capture: false })`."
        );

      // capture the log over HTTP
      const req = superagent.post(config.endpoint).timeout(config.timeout);

      // basic auth (e.g. Cabin API key)
      if (config.key) req.auth(config.key);

      // set headers if any
      if (!isEmpty(config.headers)) req.set(config.headers);

      req
        .retry(config.retry)
        .send(body)
        .end(err => {
          if (err) {
            err._captureFailed = true;
            this.config.logger.error(err);
          }
        });
    }

    // Suppress logs if it was silent
    if (config.silent) return body;

    // if there was meta information then output it
    const omitted = omit(meta, ['level', 'err']);

    // fatal should use error (e.g. in browser)
    if (level === 'fatal') level = 'error';

    // if we didn't pass a level as a method
    // (e.g. console.info), then we should still
    // use the logger's `log` method to output
    if (modifier === -1) level = 'log';

    // show stack trace if necessary (along with any metadata)
    if (level === 'error' && isError(err) && config.showStack) {
      if (!config.showMeta || isEmpty(omitted)) this.config.logger.error(err);
      else this.config.logger.error(err, omitted);
    } else if (!config.showMeta || isEmpty(omitted)) {
      this.config.logger[level](message);
    } else {
      this.config.logger[level](message, omitted);
    }

    // return the parsed body in case we need it
    return body;
  }
}

module.exports = Axe;
