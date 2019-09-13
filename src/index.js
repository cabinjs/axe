// eslint-disable-next-line import/no-unassigned-import
require('console-polyfill');

const boolean = require('boolean');
const cuid = require('cuid');
const formatSpecifiers = require('format-specifiers');
const isError = require('iserror');
const omit = require('omit.js');
const parseAppInfo = require('parse-app-info');
const parseErr = require('parse-err');
const safeStringify = require('fast-safe-stringify');
const superagent = require('superagent');
const format = require('format-util');

const pkg = require('../package.json');

const omittedLoggerKeys = ['config', 'log'];
const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const endpoint = 'https://api.cabinjs.com';
const env = process.env.NODE_ENV || 'development';
const levelError = `\`level\` invalid, must be: ${levels.join(', ')}`;

// <https://stackoverflow.com/a/43233163>
function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'object' && Object.keys(value).length === 0) ||
    (typeof value === 'string' && value.trim().length === 0)
  );
}

function isNull(val) {
  return val === null;
}

function isUndefined(val) {
  return typeof val === 'undefined';
}

function isObject(val) {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

function isString(val) {
  return typeof val === 'string';
}

function isFunction(val) {
  return typeof val === 'function';
}

function isBoolean(val) {
  return typeof val === 'boolean';
}

class Axe {
  constructor(config = {}) {
    this.config = Object.assign(
      {
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
        appInfo: process.env.APP_INFO ? boolean(process.env.APP_INFO) : true
      },
      config
    );

    this.appInfo = this.config.appInfo
      ? isFunction(parseAppInfo)
        ? parseAppInfo()
        : false
      : false;

    this.log = this.log.bind(this);

    // inherit methods from parent logger
    const methods = Object.keys(this.config.logger).filter(
      key => omittedLoggerKeys.indexOf(key) === -1
    );
    for (let i = 0; i < methods.length; i++) {
      this[methods[i]] = this.config.logger[methods[i]];
    }

    // bind helper functions for each log level
    for (let i = 0; i < levels.length; i++) {
      this[levels[i]] = (...args) =>
        this.log(...[levels[i]].concat([].slice.call(args)));
    }

    // we could have used `auto-bind` but it's not compiled for browser
    this.setLevel = this.setLevel.bind(this);
    this.setName = this.setName.bind(this);
    this.setCallback = this.setCallback.bind(this);

    // set the logger name
    if (this.config.name) this.setName(this.config.name);

    // set the logger level
    this.setLevel(this.config.level);

    // aliases
    this.err = this.error;
    this.warning = this.warn;
  }

  setCallback(callback) {
    this.config.callback = callback;
  }

  setLevel(level) {
    if (!isString(level) || levels.indexOf(level) === -1)
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
    } else if (!isString(level) || levels.indexOf(level) === -1) {
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
      formatSpecifiers.filter(t => message.indexOf(t) !== -1).length > 0
    ) {
      // otherwise if there are three args and if the `message` contains
      // a placeholder token (e.g. '%s' or '%d' - see above `formatSpecifiers` variable)
      // then we can infer that the `meta` arg passed is used for formatting
      message = format(message, meta);
      meta = {};
    } else if (!isError(message)) {
      if (isError(meta)) {
        meta = { err: parseErr(meta) };
        // } else if (!isPlainObject(meta) && !isUndefined(meta) && !isNull(meta)) {
      } else if (!isObject(meta) && !isUndefined(meta) && !isNull(meta)) {
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

    // if (!isPlainObject(meta)) meta = {};
    if (!isObject(meta)) meta = {};

    let err;
    if (isError(message)) {
      err = message;
      if (!isObject(meta.err)) meta.err = parseErr(err);
      ({ message } = message);
    } else if (isError(meta.err)) {
      err = meta.err;
    }

    // omit `callback` from `meta` if it was passed
    const callback =
      isFunction(config.callback) &&
      (!isBoolean(meta.callback) || meta.callback);
    meta = omit(meta, ['callback']);

    // set default level on meta
    meta.level = level;

    // add `app` object to metadata
    if (this.appInfo) meta.app = this.appInfo;

    // set the body used for returning with and sending logs
    // (and also remove circular references)
    const body = safeStringify({ message, meta });

    // send to Cabin or other logging service here the `message` and `meta`
    if (
      config.capture &&
      config.levels.indexOf(level) !== -1 &&
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

      if (!process.browser) req.set('User-Agent', `axe/${pkg.version}`);

      // basic auth (e.g. Cabin API key)
      if (config.key) req.auth(config.key);

      // set headers if any
      if (!isEmpty(config.headers)) req.set(config.headers);

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
    if (callback) config.callback(level, message, meta);

    // suppress logs if it was silent
    if (config.silent) return body;

    // return early if it is not a valid logging level
    if (config.levels.indexOf(level) === -1) return body;

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
