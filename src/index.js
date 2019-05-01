const format = require('util-format-x');
const superagent = require('superagent');
const cuid = require('cuid');
const parseErr = require('parse-err');
const safeStringify = require('fast-safe-stringify');
// <https://lacke.mn/reduce-your-bundle-js-file-size/>
// <https://github.com/lodash/babel-plugin-lodash/issues/221>
const isError = require('lodash/isError');
const isObject = require('lodash/isObject');
const isString = require('lodash/isString');
const isBoolean = require('lodash/isBoolean');
const omit = require('lodash/omit');
const isEmpty = require('lodash/isEmpty');
const isPlainObject = require('lodash/isPlainObject');
const isUndefined = require('lodash/isUndefined');
const isNull = require('lodash/isNull');
const isFunction = require('lodash/isFunction');
const boolean = require('boolean');
const { standard } = require('message-headers');
const formatSpecifiers = require('format-specifiers');
const parseAppInfo = require('parse-app-info');

const appInfo = isFunction(parseAppInfo) ? parseAppInfo() : false;
const standardHeaders = standard.map(o => o['Header Field Name'].toLowerCase());

// eslint-disable-next-line import/no-unassigned-import
require('console-polyfill');

const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const endpoint = 'https://api.cabinjs.com';
const env = process.env.NODE_ENV || 'development';
const levelError = `\`level\` invalid, must be: ${levels.join(', ')}`;

class Axe {
  constructor(config = {}) {
    this.config = {
      key: '',
      endpoint,
      headers: {},
      timeout: 5000,
      retry: 3,
      showStack: process.env.SHOW_STACK
        ? boolean(process.env.SHOW_STACK)
        : true,
      showMeta: process.env.SHOW_META ? boolean(process.env.SHOW_META) : true,
      silent: false,
      logger: console,
      name: false,
      level: 'info',
      levels: ['info', 'warn', 'error', 'fatal'],
      capture: process.browser ? false : env === 'production',
      callback: false,
      ...config
    };

    Object.assign(this, omit(this.config.logger, ['config', 'log']));

    // we could have used `auto-bind` but it's not compiled for browser
    this.setLevel = this.setLevel.bind(this);
    this.setName = this.setName.bind(this);
    this.log = this.log.bind(this);

    // set the logger name
    if (this.config.name) this.setName(this.config.name);

    // set the logger level
    this.setLevel(this.config.level);

    // bind helper functions for each log level
    levels.forEach(level => {
      this[level] = (...args) =>
        this.log(...[level].concat([].slice.call(args)));
    });

    // aliases
    this.err = this.error;
    this.warning = this.warn;
  }

  setLevel(level) {
    if (!isString(level) || !levels.includes(level))
      throw new Error(levelError);
    // support signale logger and other loggers that use `logLevel`
    if (isString(this.config.logger.logLevel))
      this.config.logger.logLevel = level;
    else this.config.logger.level = level;
    // adjusts `this.config.levels` array
    // so that it has all proceeding (inclusive)
    this.config.levels = levels.slice(levels.indexOf(level));
  }

  setName(name) {
    if (!isString(name)) throw new Error('`name` must be a String');
    // support signale logger and other loggers that use `scope`
    if (isString(this.config.logger.scope)) this.config.logger.scope = name;
    else this.config.logger.name = name;
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
    } else if (!isString(level) || !levels.includes(level)) {
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
      formatSpecifiers.some(t => message.includes(t))
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

    // omit `callback` from `meta` if it was passed
    const callback = isBoolean(meta.callback) && !callback;
    meta = omit(meta, ['callback']);

    // set default level on meta
    meta.level = level;

    // add `app` object to metadata
    if (appInfo) meta.app = appInfo;

    // set the body used for returning with and sending logs
    // (and also remove circular references)
    const body = safeStringify({ message, meta });

    // send to Cabin or other logging service here the `message` and `meta`
    if (
      config.capture &&
      config.levels.includes(level) &&
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
        if (process.browser)
          headers = Object.keys(config.headers).reduce((memo, header) => {
            if (!standardHeaders.includes(config.headers[header].toLowerCase()))
              memo[header] = config.headers[header];
            return memo;
          }, {});
        req.set(headers);
      }

      req
        .retry(config.retry)
        .type('application/json')
        .send(body)
        .end(err => {
          if (err) {
            err._captureFailed = true;
            this.config.logger.error(err);
          }
        });
    }

    // custom callback function (e.g. Slack message)
    if (isFunction(config.callback) && callback)
      config.callback(level, message, meta);

    // suppress logs if it was silent
    if (config.silent) return body;

    // return early if it is not a valid logging level
    if (!config.levels.includes(level)) return body;

    //
    // determine log method to use
    //
    // if we didn't pass a level as a method
    // (e.g. console.info), then we should still
    // use the logger's `log` method to output
    //
    // and fatal should use error (e.g. in browser)
    //
    let method = level;
    if (modifier === -1) method = 'log';
    else if (level === 'fatal') method = 'error';

    // if there was meta information then output it
    const omitted = omit(meta, ['level', 'err']);

    // show stack trace if necessary (along with any metadata)
    if (method === 'error' && isError(err) && config.showStack) {
      if (!config.showMeta || isEmpty(omitted)) this.config.logger.error(err);
      else this.config.logger.error(err, omitted);
    } else if (!config.showMeta || isEmpty(omitted)) {
      this.config.logger[method](message);
    } else {
      this.config.logger[method](message, omitted);
    }

    // return the parsed body in case we need it
    return body;
  }
}

module.exports = Axe;
