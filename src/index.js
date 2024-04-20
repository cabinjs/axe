// eslint-disable-next-line import/no-unassigned-import
require('console-polyfill');

// eslint-disable-next-line unicorn/prefer-node-protocol
const os = require('os');
const format = require('@ladjs/format-util');
const formatSpecifiers = require('format-specifiers');
const get = require('@strikeentco/get');
const isError = require('iserror');
const isSymbol = require('is-symbol');
const mergeOptions = require('merge-options');
const pMapSeries = require('p-map-series');
const parseAppInfo = require('parse-app-info');
const parseErr = require('parse-err');
const pickDeep = require('pick-deep');
const set = require('@strikeentco/set');
const unset = require('unset-value');
const { boolean } = require('boolean');
const pkg = require('../package.json');

const silentSymbol = Symbol.for('axe.silent');
const omittedLoggerKeys = new Set(['config', 'log']);
const levels = ['trace', 'debug', 'info', 'warn', 'error', 'fatal'];
const aliases = { warning: 'warn', err: 'error' };
const levelError = `\`level\` invalid, must be: ${levels.join(', ')}`;
const name =
  process.env.NODE_ENV === 'development'
    ? false
    : process.env.HOSTNAME || os.hostname();

// <https://github.com/sindresorhus/is-plain-obj/blob/main/index.js>
function isPlainObject(value) {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return (
    (prototype === null ||
      prototype === Object.prototype ||
      Object.getPrototypeOf(prototype) === null) &&
    !(Symbol.toStringTag in value) &&
    !(Symbol.iterator in value) &&
    !isSymbol(value)
  );
}

// <https://github.com/GeenenTijd/dotify/blob/master/dotify.js>
function dotifyToArray(obj) {
  const res = [];
  function recurse(obj, current) {
    for (const key of Reflect.ownKeys(obj)) {
      const value = obj[key];
      const convertedKey = isSymbol(key)
        ? Symbol.keyFor(key) || key.description
        : key;
      const newKey = current ? current + '.' + convertedKey : convertedKey; // joined key with dot
      // if (value && typeof value === 'object' && !(value instanceof Date) && !ObjectID.isValid(value)) {
      if (isPlainObject(value) && res.indexOf(convertedKey) === -1) {
        res.push(convertedKey);
        recurse(value, newKey); // it's a nested object, so do it again
      } else if (res.indexOf(newKey) === -1) {
        res.push(newKey);
      }
    }
  }

  recurse(obj);
  return res;
}

// <https://stackoverflow.com/a/43233163>
function isEmpty(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'object' && Reflect.ownKeys(value).length === 0) ||
    (typeof value === 'string' && value.trim().length === 0)
  );
}

function isNull(value) {
  return value === null;
}

function isUndefined(value) {
  return value === undefined;
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

function getFunction(value) {
  return isFunction(value) ? value : null;
}

class Axe {
  // eslint-disable-next-line complexity
  constructor(config = {}) {
    const remappedFields = {};
    if (process.env.AXE_REMAPPED_META_FIELDS) {
      const fields = process.env.AXE_REMAPPED_META_FIELDS;
      const arr = fields.split(',').map((v) => v.split(':'));
      for (const [prop, value] of arr) {
        remappedFields[prop] = value;
      }
    }

    // envify does not support conditionals well enough so we declare vars outside
    let omittedFields = process.env.AXE_OMIT_META_FIELDS;
    if (typeof omittedFields === 'string')
      omittedFields = omittedFields.split(',').map((s) => s.trim());
    if (!Array.isArray(omittedFields)) omittedFields = [];

    let pickedFields = process.env.AXE_PICK_META_FIELDS;
    if (typeof pickedFields === 'string')
      pickedFields = pickedFields.split(',').map((s) => s.trim());
    if (!Array.isArray(pickedFields)) pickedFields = [];

    this.config = mergeOptions(
      {
        showStack: process.env.AXE_SHOW_STACK
          ? boolean(process.env.AXE_SHOW_STACK)
          : true,
        meta: Object.assign(
          {
            show: process.env.AXE_SHOW_META
              ? boolean(process.env.AXE_SHOW_META)
              : true,
            remappedFields,
            omittedFields,
            pickedFields,
            cleanupRemapping: true,
            hideHTTP: 'is_http',
            // implemented mainly for @ladjs/graceful to
            // suppress unnecessary meta output to console
            hideMeta: 'hide_meta'
          },
          typeof config.meta === 'object' ? config.meta : {}
        ),
        version: pkg.version,
        silent: false,
        logger: console,
        name,
        level: 'info',
        levels: ['info', 'warn', 'error', 'fatal'],
        appInfo: process.env.AXE_APP_INFO
          ? boolean(process.env.AXE_APP_INFO)
          : true,
        hooks: Object.assign(
          {
            pre: [],
            post: []
          },
          typeof config.hooks === 'object' ? config.hooks : {}
        )
      },
      config
    );

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
      // Ensure function exists in logger passed
      if (element === 'fatal') {
        this.config.logger.fatal =
          getFunction(this.config.logger[element]) ||
          getFunction(this.config.logger.error) ||
          getFunction(this.config.logger.info) ||
          getFunction(this.config.logger.log);
      } else {
        this.config.logger[element] =
          getFunction(this.config.logger[element]) ||
          getFunction(this.config.logger.info) ||
          getFunction(this.config.logger.log);
      }

      if (!isFunction(this.config.logger[element])) {
        throw new Error(`\`${element}\` must be a function on the logger.`);
      }

      // Bind log handler which normalizes args and populates meta
      this[element] = (...args) =>
        this.log(element, ...Array.prototype.slice.call(args));
    }

    this.setLevel = this.setLevel.bind(this);
    this.getNormalizedLevel = this.getNormalizedLevel.bind(this);
    this.setName = this.setName.bind(this);

    // Set the logger name
    if (this.config.name) this.setName(this.config.name);

    // Set the logger level
    this.setLevel(this.config.level);

    // Aliases
    this.err = this.error;
    this.warning = this.warn;

    // Pre and Post Hooks
    this.pre = function (level, fn) {
      this.config.hooks.pre.push(function (_level, ...args) {
        if (level !== _level) return [...args];
        return fn(...args);
      });
    };

    this.post = function (level, fn) {
      this.config.hooks.post.push(function (_level, ...args) {
        if (level !== _level) return [...args];
        return fn(...args);
      });
    };
  }

  setLevel(level) {
    if (!isString(level) || levels.indexOf(level) === -1)
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
    if (levels.indexOf(level) === -1) return 'info';
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
    const originalArgs = [];
    const errors = [];
    let hasMessage = false;
    let hasLevel = true;

    if (!isUndefined(level)) originalArgs.push(level);
    if (!isUndefined(message)) originalArgs.push(message);
    if (!isUndefined(meta)) originalArgs.push(meta);
    for (const arg of Array.prototype.slice.call(args)) {
      originalArgs.push(arg);
    }

    let modifier = 0;

    if (isString(level) && isString(aliases[level])) {
      level = aliases[level];
    } else if (isError(level)) {
      hasLevel = false;
      meta = message;
      message = level;
      level = 'error';
    } else if (!isString(level) || levels.indexOf(level) === -1) {
      hasLevel = false;
      meta = message;
      message = level;
      level = this.getNormalizedLevel(level);
      modifier = -1;
    }

    // Return early if it is not a valid logging level
    if (this.config.levels.indexOf(level) === -1) return;

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
      message = undefined;
      meta = {};
      const messages = [];
      for (const arg of originalArgs.slice(
        hasLevel && modifier === 0 ? 1 : 0
      )) {
        if (isError(arg)) errors.push(arg);
        // pushes number, object, string, etc for formatting
        else messages.push(arg);
      }

      if (messages.length > 0) {
        message = format(...messages);
        hasMessage = true;
      }

      if (errors.length > 0 && level === 'log') level = 'error';
    } else if (
      !isBunyan &&
      originalArgs.length === 3 + modifier &&
      isString(message) &&
      formatSpecifiers.some((t) => message.indexOf(t) !== -1)
    ) {
      // Otherwise if there are three args and if the `message` contains
      // a placeholder token (e.g. '%s' or '%d' - see above `formatSpecifiers` variable)
      // then we can infer that the `meta` arg passed is used for formatting
      message = format(message, meta);
      meta = {};
    } else if (!isError(message)) {
      if (isError(meta)) {
        errors.push(meta);
        meta = {};
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
    } else if (isError(meta)) {
      errors.push(meta);
      // handle additional args
      const messages = [];
      if (isError(message)) {
        errors.unshift(message);
        message = undefined;
      }

      for (const arg of originalArgs.slice(2 + modifier)) {
        // should skip this better with slice and modifier adjustment
        if (meta === arg) continue;
        if (isError(arg)) errors.push(arg);
        else messages.push(arg);

        if (messages.length > 0) {
          message = format(...messages);
          hasMessage = true;
        }
      }

      if (level === 'log') level = 'error';

      meta = {};
    }

    if (!isUndefined(meta) && !isObject(meta)) meta = { original_meta: meta };
    else if (!isObject(meta)) meta = {};

    if (isError(message)) {
      errors.unshift(message);
      message = undefined;
    }

    //
    // rewrite `meta.err` to `meta.original_err` for consistency
    // (in case someone has an object with `.err` property on it with an error)
    //
    if (isObject(meta.err)) {
      if (isError(meta.err)) errors.push(meta.err);
      meta.original_err = isError(meta.err) ? parseErr(meta.err) : meta.err;
    }

    let err;
    if (errors.length > 0) {
      if (errors.length === 1) {
        err = errors[0];
      } else {
        err = new Error(
          [...new Set(errors.map((e) => e.message).filter(Boolean))].join('; ')
        );
        err.stack = [
          ...new Set(errors.map((e) => e.stack).filter(Boolean))
        ].join('\n\n');
        err.errors = errors;
      }

      meta.err = parseErr(err);
      if (!isString(message)) message = err.message;
    }

    //
    // NOTE: this was removed in v10.2.2 due to circular reference issues
    //       (the workaround would involve safeStringify and then JSON.parse which would be perf bloat)
    //       (there still might be another workaround or perhaps we don't add all the args here except additional)
    //
    // Set `args` prop with original arguments passed
    // meta.args = originalArgs;

    // Set default level on meta
    meta.level = level;

    // Add `app` object to metadata
    if (this.appInfo) meta.app = this.appInfo;

    //
    // determine log method to use
    //
    // if we didn't pass a level as a method
    // (e.g. console.info), then we should still
    // use the logger's `log` method to output
    //
    // and fatal should use error (e.g. in browser)
    //
    const method = modifier === -1 ? 'log' : level;

    // pre-hooks
    for (const hook of this.config.hooks.pre) {
      [err, message, meta] = hook(method, err, message, meta);
    }

    //
    // NOTE: using lodash _.omit and _.pick would have been _very slow_
    //
    // const omittedAndPickedFields = {
    //   ..._.omit(meta, this.config.meta.omittedFields),
    //   ..._.pick(meta, this.config.meta.pickedFields)
    // };
    //
    // also we don't want to mutate anything in `meta`
    // and ideally we only want to pick exactly what we need
    // (and not have two operations, one for omit, and one for pick)
    //

    // set a boolean flag if we had the silent symbol or not
    const hadTrueSilentSymbol = boolean(meta[silentSymbol]);

    if (!isEmpty(this.config.meta.remappedFields)) {
      for (const key of Reflect.ownKeys(this.config.meta.remappedFields)) {
        set(meta, this.config.meta.remappedFields[key], get(meta, key));
        unset(meta, key);
        // cleanup empty objects after remapping
        if (this.config.meta.cleanupRemapping) {
          const index = key.lastIndexOf('.');
          if (index === -1) continue;
          const parentKey = key.slice(0, index);
          if (isEmpty(get(meta, parentKey))) unset(meta, parentKey);
        }
      }
    }

    if (
      !isEmpty(this.config.meta.omittedFields) ||
      !isEmpty(this.config.meta.pickedFields)
    ) {
      const dotified = dotifyToArray(meta);
      // dotified = [
      //   'err.name',
      //   'err.message',
      //   'err.stack',
      //   'level',
      //   'app.name',
      //   'app.version',
      //   'app.node',
      //   'app.hash',
      //   // ...
      // ]

      if (!isEmpty(this.config.meta.omittedFields)) {
        for (const prop of this.config.meta.omittedFields) {
          // <https://stackoverflow.com/a/9882349>
          let i = dotified.length;
          while (i--) {
            if (
              dotified[i] === prop ||
              (!isSymbol(dotified[i]) && dotified[i].indexOf(`${prop}.`) === 0)
            )
              dotified.splice(i, 1);
          }
        }
      }

      const pickedSymbols = [];

      if (!isEmpty(this.config.meta.pickedFields)) {
        for (const prop of this.config.meta.pickedFields) {
          // response.headers.boop
          // response.headers.beep
          // response.body
          // response.text
          // response
          //
          // so we need to split by the first period and omit any keys from dotified starting with it
          if (isSymbol(prop)) {
            if (meta[prop]) pickedSymbols.push([prop, meta[prop]]);
          } else {
            const index = prop.indexOf('.');
            const key = prop.slice(0, index + 1);
            if (index !== -1) {
              let i = dotified.length;
              while (i--) {
                if (dotified[i] === key.slice(0, -1)) dotified.splice(i, 1);
                else if (dotified[i].indexOf(key) === 0) dotified.splice(i, 1);
              }
            }
          }

          // finally add it if it did not already exist
          if (dotified.indexOf(prop) === -1) dotified.push(prop);
        }
      }

      //
      // iterate over all dotified values to check for symbols
      //
      // NOTE: this does not take into account that they could already be in `pickedSymbols`
      //       (and it doesn't also do bigints yet)
      //
      for (const prop of dotified) {
        if (isSymbol(prop)) {
          if (meta[prop] !== undefined) pickedSymbols.push([prop, meta[prop]]);
        } else if (meta[Symbol.for(prop)] !== undefined) {
          pickedSymbols.push([Symbol.for(prop), meta[Symbol.for(prop)]]);
        }
      }

      //
      // now we call pick-deep using the final array
      //
      // NOTE: this does not pick symbols, bigints, nor streams
      //       <https://github.com/strikeentco/pick-deep/issues/2>
      //       <https://github.com/strikeentco/pick-deep/issues/2>
      //
      // NOTE: this is wrapped in try/catch in case similar errors occur
      //       <https://github.com/stripe/stripe-node/issues/1796>
      //
      try {
        meta = pickDeep(meta, dotified);
      } catch (err) {
        this.config.logger.error(err);
      }

      //
      // if there were any top-level symbols to be
      // picked then we need to add them back here to the list
      //
      // NOTE: we'd probably want to do the same for bigints as symbols
      //
      if (pickedSymbols.length > 0) {
        for (const [key, value] of pickedSymbols) {
          meta[key] = value;
        }
      }
    }

    // only invoke logger methods if it was not silent
    if (!this.config.silent && !hadTrueSilentSymbol) {
      // Show stack trace if necessary (along with any metadata)
      if (isError(err) && this.config.showStack) {
        if (!this.config.meta.show || isEmpty(meta)) {
          this.config.logger[method](...(hasMessage ? [message, err] : [err]));
        } else if (
          this.config.meta.hideMeta &&
          meta[this.config.meta.hideMeta]
        ) {
          this.config.logger[method](...(hasMessage ? [message, err] : [err]));
        } else {
          this.config.logger[method](
            ...(hasMessage ? [message, err, meta] : [err, meta])
          );
        }
      } else if (!this.config.meta.show || isEmpty(meta)) {
        this.config.logger[method](message);
      } else if (
        (this.config.meta.hideMeta && meta[this.config.meta.hideMeta]) ||
        (this.config.meta.hideHTTP && meta[this.config.meta.hideHTTP])
      ) {
        this.config.logger[method](message);
      } else {
        this.config.logger[method](message, meta);
      }
    }

    // post-hooks
    if (this.config.hooks.post.length === 0)
      return { method, err, message, meta };
    return pMapSeries(this.config.hooks.post, (hook) =>
      hook(method, err, message, meta)
    )
      .then()
      .catch((err) => {
        this.config.logger.error(err);
      });
  }
}

module.exports = Axe;
