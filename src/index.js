const { format } = require('util');
const debug = require('debug');
const _ = require('lodash');
const { isBrowser, isNode } = require('browser-or-node');
const { Signale } = require('signale');

// these are known as "placeholder tokens", see this link for more info:
// <https://nodejs.org/api/util.html#util_util_format_format_args>
//
// since they aren't exposed (or don't seem to be) by node (at least not yet)
// we just define an array that contains them for now
// <https://github.com/nodejs/node/issues/17601>
const tokens = ['%s', '%d', '%i', '%f', '%j', '%o', '%O', '%%'];

class Axe {
  constructor(config = {}) {
    // debugName gets passed to logger.debug
    this.config = Object.assign(
      {
        timestamp: 'toLocaleString', // or toISO
        locale: 'en',
        showStack: true,
        silent: false,
        appName: 'axe',
        processName: null,
        levels: ['debug', 'info', 'warning', 'error', 'fatal'],
        signale: {}
      },
      config
    );

    // bind nice a logger that we'll use based on
    // the environment instead of VanillaJS `console`
    this.signale = new Signale(this.config.signale);

    // signale allows a scope [prefix] name
    if (isNode && this.config.processName)
      this.signale.scope(this.config.processName);

    // we could have used `auto-bind` but it's not compiled for browser
    this.log = this.log.bind(this);

    // bind helper functions for each log level
    Axe.levels.forEach(level => {
      this[level] = (...args) => {
        this.log(...[level].concat([].slice.call(args)));
      };
    });

    // aliases
    this.err = this.error;
    this.warn = this.warning;
  }

  // eslint-disable-next-line complexity
  log(level, message, meta = {}, ...args) {
    const { config } = this;
    let modifier = 0;

    if (level === 'warn') level = 'warning';
    if (level === 'err') level = 'error';

    if (!_.isString(level) || !_.includes(config.levels, level)) {
      meta = message;
      message = level;
      level = 'info';
      modifier = -1;
    }

    // if there are four or more args
    // then infer to use util.format on everything
    if (arguments.length >= 4 + modifier) {
      message = format(
        ...[]
          .concat([level, message, meta].slice.call(args))
          .slice(1 + modifier)
      );
      meta = {};
    } else if (
      arguments.length === 3 + modifier &&
      _.isString(message) &&
      tokens.some(t => message.includes(t))
    ) {
      // otherwise if there are three args and if the `message` contains
      // a placeholder token (e.g. '%s' or '%d' - see above `tokens` variable)
      // then we can infer that the `meta` arg passed is used for formatting
      message = format(message, meta);
      meta = {};
    } else if (
      !_.isPlainObject(meta) &&
      !_.isUndefined(meta) &&
      !_.isNull(meta)
    ) {
      // if the `meta` variable passed was not an Object then convert it
      message = format(message, meta);
      meta = {};
    } else if (!_.isString(message)) {
      // if the message is not a string then we should run `util.format` on it
      // assuming we're formatting it like it was another argument
      // (as opposed to using something like fast-json-stringify)
      message = format(message);
    }

    if (!_.isPlainObject(meta)) meta = {};

    let err;
    if (_.isError(message)) {
      err = message;
      if (!_.isObject(meta.err))
        meta.err = { stack: message.stack, message: message.message };
      ({ message } = message);
    }

    // set default level on meta
    meta.level = level;

    // TODO: send to cabin here (message, meta)

    // Suppress logs if it was silent
    if (config.silent) return;

    if (level === 'debug') {
      let name = config.processName;
      if (!name && require.main && require.main.filename)
        name = require.main.filename;
      if (!name) name = config.appName;
      debug(name)(message, _.omit(meta, 'level'));
    } else {
      if (isBrowser && config.processName)
        message = `[${config.processName}] ${message}`;

      // if there was meta information then output it
      const omitted = _.omit(meta, ['level', 'err']);
      if (_.isEmpty(omitted)) this.signale[level](message);
      else this.signale[level](message, omitted);

      // if we're not showing the stack trace then return early
      if (!config.showStack) return;

      // output the stack trace to the console for debugging
      if (err) this.signale.error(err);
    }
  }
}

module.exports = Axe;
