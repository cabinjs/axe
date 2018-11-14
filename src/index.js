const format = require('format-util');
const superagent = require('@ladjs/superagent');
const cuid = require('cuid');
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
const boolean = require('boolean');
const { standard } = require('message-headers');
const formatSpecifiers = require('format-specifiers');

const standardHeaders = standard.map(o => o['Header Field Name'].toLowerCase());

const hasWindow =
  typeof window !== 'undefined' && typeof window.document !== 'undefined';

// eslint-disable-next-line import/no-unassigned-import
require('console-polyfill');

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
        showStack: boolean(process.env.SHOW_STACK || env !== 'production'),
        showMeta: boolean(process.env.SHOW_META),
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
  log(level, message, meta, ...args) {
    let originalArgs = [level, message];
    if (!isUndefined(meta)) originalArgs.push(meta);
    originalArgs = originalArgs.concat([].slice.call(args));
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
    if (originalArgs.length >= 4 + modifier) {
      message = format(...originalArgs.slice(1 + modifier));
      meta = {};
    } else if (
      originalArgs.length === 3 + modifier &&
      isString(message) &&
      formatSpecifiers.some(t => includes(message, t))
    ) {
      // otherwise if there are three args and if the `message` contains
      // a placeholder token (e.g. '%s' or '%d' - see above `formatSpecifiers` variable)
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
          "Cabin API key required (e.g. `{ key: 'YOUR-CABIN-API-KEY' })`)\n<https://cabinjs.com>"
        );

      // capture the log over HTTP
      const req = superagent
        .post(config.endpoint)
        .set('X-Request-Id', cuid())
        .timeout(config.timeout);

      // basic auth (e.g. Cabin API key)
      if (config.key) req.auth(config.key);

      // set headers if any
      if (!isEmpty(config.headers)) {
        let { headers } = config;
        if (hasWindow)
          headers = Object.keys(config.headers).reduce((memo, header) => {
            if (
              !includes(standardHeaders, config.headers[header].toLowerCase())
            )
              memo[header] = config.headers[header];
            return memo;
          }, {});
        req.set(headers);
      }

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
