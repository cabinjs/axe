// eslint-disable-next-line import/no-unassigned-import
require('console-polyfill');

const cuid = require('cuid');
const format = require('@ladjs/format-util');
const formatSpecifiers = require('format-specifiers');
const isError = require('iserror');
const omit = require('lodash.omit');
const parseAppInfo = require('parse-app-info');
const parseErr = require('parse-err');
const safeStringify = require('fast-safe-stringify');
const superagent = require('superagent');
const { boolean } = require('boolean');

const pkg = require('../package.json');

const omittedLoggerKeys = new Set(['config', 'log']);
const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const aliases = { warning: 'warn', err: 'error' };
const endpoint = 'https://api.cabinjs.com';
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

function isNull(value) {
  return value === null;
}

function isUndefined(value) {
  return typeof value === 'undefined';
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isString(value) {
  return typeof value === 'string';
}

function isFunction(value) {
  return typeof value === 'function';
}

function isBoolean(value) {
  return typeof value === 'boolean';
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
        meta: {
          show: process.env.SHOW_META ? boolean(process.env.SHOW_META) : true,
          showApp: process.env.SHOW_META_APP
            ? boolean(process.env.SHOW_META_APP)
            : false,
          omittedFields: process.env.OMIT_META_FIELDS
            ? process.env.OMIT_META_FIELDS.split(',').map((s) => s.trim())
            : []
        },
        silent: false,
        logger: console,
        name: false,
        level: 'info',
        levels: ['info', 'warn', 'error', 'fatal'],
        // TODO: if user specifies `key` and it is `process.platform === 'browser' || process.browser || env === 'production'` then set `capture` to `true`
        capture: false,
        callback: false,
        appInfo: process.env.APP_INFO ? boolean(process.env.APP_INFO) : true
      },
      config
    );

    // For backwards compatability
    if (this.config.showMeta) {
      this.config.meta.show = this.config.showMeta;
      delete this.config.showMeta;
    }

    this.appInfo = this.config.appInfo
      ? isFunction(parseAppInfo)
        ? parseAppInfo()
        : false
      : false;

    this.log = this.log.bind(this);

    // Inherit methods from parent logger
    const methods = Object.keys(this.config.logger).filter(
      (key) => !omittedLoggerKeys.has(key)
    );
    for (const element of methods) {
      this[element] = this.config.logger[element];
    }

    // Bind helper functions for each log level
    for (const element of levels) {
      this[element] = (...args) =>
        this.log(...[element].concat(Array.prototype.slice.call(args)));
    }

    // We could have used `auto-bind` but it's not compiled for browser
    this.setLevel = this.setLevel.bind(this);
    this.getNormalizedLevel = this.getNormalizedLevel.bind(this);
    this.setName = this.setName.bind(this);
    this.setCallback = this.setCallback.bind(this);

    // Set the logger name
    if (this.config.name) this.setName(this.config.name);

    // Set the logger level
    this.setLevel(this.config.level);

    // Aliases
    this.err = this.error;
    this.warning = this.warn;
  }

  setCallback(callback) {
    this.config.callback = callback;
  }

  setLevel(level) {
    if (!isString(level) || !levels.includes(level))
      throw new Error(levelError);
    // Support signale logger and other loggers that use `logLevel`
    if (isString(this.config.logger.logLevel))
      this.config.logger.logLevel = level;
    else this.config.logger.level = level;
    // Adjusts `this.config.levels` array
    // so that it has all proceeding (inclusive)
    this.config.levels = levels.slice(levels.indexOf(level));
  }

  getNormalizedLevel(level) {
    if (!isString(level)) return 'info';
    if (isString(aliases[level])) return aliases[level];
    if (!levels.includes(level)) return 'info';
    return level;
  }

  setName(name) {
    if (!isString(name)) throw new Error('`name` must be a String');
    // Support signale logger and other loggers that use `scope`
    if (isString(this.config.logger.scope)) this.config.logger.scope = name;
    else this.config.logger.name = name;
  }

  // eslint-disable-next-line complexity
  log(level, message, meta, ...args) {
    let originalArgs = [];
    if (!isUndefined(level)) originalArgs.push(level);
    if (!isUndefined(message)) originalArgs.push(message);
    if (!isUndefined(meta)) originalArgs.push(meta);
    originalArgs = originalArgs.concat(Array.prototype.slice.call(args));
    const { config } = this;
    let modifier = 0;

    if (isString(level) && isString(aliases[level])) {
      level = aliases[level];
    } else if (isError(level)) {
      meta = message;
      message = level;
      level = 'error';
    } else if (!isString(level) || !levels.includes(level)) {
      meta = message;
      message = level;
      level = this.getNormalizedLevel(level);
      modifier = -1;
    }

    // Bunyan support (meta, message, ...args)
    let isBunyan = false;
    if ((isObject(message) || Array.isArray(message)) && isString(meta)) {
      isBunyan = true;
      const _meta = meta;
      meta = message;
      message =
        isString(_meta) && originalArgs.length >= 3 + modifier
          ? format(...originalArgs.slice(2 + modifier))
          : _meta;
    }

    // If message was undefined then set it to level
    if (isUndefined(message)) message = level;

    // If only `message` was passed then if it was an Object
    // preserve it as an Object by setting it as meta
    if (
      originalArgs.slice(1 + modifier).length === 1 &&
      !isString(message) &&
      !isError(message)
    ) {
      meta = { message };
      message = level;
    } else if (!isBunyan && originalArgs.length >= 4 + modifier) {
      // If there are four or more args
      // then infer to use util.format on everything
      message = format(...originalArgs.slice(1 + modifier));
      meta = {};
    } else if (
      !isBunyan &&
      originalArgs.length === 3 + modifier &&
      isString(message) &&
      formatSpecifiers.some((t) => message.includes(t))
    ) {
      // Otherwise if there are three args and if the `message` contains
      // a placeholder token (e.g. '%s' or '%d' - see above `formatSpecifiers` variable)
      // then we can infer that the `meta` arg passed is used for formatting
      message = format(message, meta);
      meta = {};
    } else if (!isError(message)) {
      if (isError(meta)) {
        meta = { err: parseErr(meta) };
        // } else if (!isPlainObject(meta) && !isUndefined(meta) && !isNull(meta)) {
      } else if (!isObject(meta) && !isUndefined(meta) && !isNull(meta)) {
        // If the `meta` variable passed was not an Object then convert it
        message = format(message, meta);
        meta = {};
      } else if (!isString(message)) {
        // If the message is not a string then we should run `util.format` on it
        // assuming we're formatting it like it was another argument
        // (as opposed to using something like fast-json-stringify)
        message = format(message);
      }
    }

    // If (!isPlainObject(meta)) meta = {};
    if (!isUndefined(meta) && !isObject(meta)) meta = { meta };
    else if (!isObject(meta)) meta = {};

    let error;
    if (isError(message)) {
      error = message;
      if (!isObject(meta.err)) meta.err = parseErr(error);
      ({ message } = message);
    } else if (isError(meta.err)) {
      error = meta.err;
    }

    // Omit `callback` from `meta` if it was passed
    const callback =
      isFunction(config.callback) &&
      (!isBoolean(meta.callback) || meta.callback);
    meta = omit(meta, ['callback']);

    // Set default level on meta
    meta.level = level;

    // Add `app` object to metadata
    if (this.appInfo) meta.app = this.appInfo;

    // Set the body used for returning with and sending logs
    // (and also remove circular references)
    const body = safeStringify({ message, meta });

    // Send to Cabin or other logging service here the `message` and `meta`
    if (
      config.capture &&
      config.levels.includes(level) &&
      (!isError(error) || !error._captureFailed)
    ) {
      // If the user didn't specify a key
      // and they are using the default endpoint
      // then we should throw an error to them
      if (config.endpoint === endpoint && !config.key)
        throw new Error(
          "Cabin API key required (e.g. `{ key: 'YOUR-CABIN-API-KEY' })`)\n<https://cabinjs.com>"
        );

      // Capture the log over HTTP
      const request = superagent
        .post(config.endpoint)
        .set('X-Request-Id', cuid())
        .timeout(config.timeout);

      if (!process.browser) request.set('User-Agent', `axe/${pkg.version}`);

      // Basic auth (e.g. Cabin API key)
      if (config.key) request.auth(config.key);

      // Set headers if any
      if (!isEmpty(config.headers)) request.set(config.headers);

      request
        .type('application/json')
        .send(body)
        .retry(config.retry)
        .end((error_) => {
          if (error_) {
            error_._captureFailed = true;
            this.config.logger.error(error_);
          }
        });
    }

    // Custom callback function (e.g. Slack message)
    if (callback) config.callback(level, message, meta);

    // Suppress logs if it was silent
    if (config.silent) return body;

    // Return early if it is not a valid logging level
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

    // If there was meta information then output it
    // setup ommitted fields
    const omittedFields = ['level', 'err'].concat(
      this.config.meta.omittedFields
    );
    // Omit app is configured
    if (!this.config.meta.showApp) omittedFields.push('app');

    const omitted = omit(meta, omittedFields);

    // Show stack trace if necessary (along with any metadata)
    if (method === 'error' && isError(error) && config.showStack) {
      if (!config.meta.show || isEmpty(omitted))
        this.config.logger.error(error);
      else this.config.logger.error(error, omitted);
    } else if (!config.meta.show || isEmpty(omitted)) {
      this.config.logger[method](message);
    } else {
      this.config.logger[method](message, omitted);
    }

    // Return the parsed body in case we need it
    return body;
  }
}

module.exports = Axe;
