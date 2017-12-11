const { format } = require('util');
const autoBind = require('auto-bind');
const debug = require('debug');
const _ = require('lodash');
const chalk = require('chalk');

// `debug` (the least serious)
// `info`
// `warning` (also aliased as `warn`)
// `error` (also aliased as `err`)
// `fatal` (the most serious)
const levels = {
  debug: 'cyan',
  info: 'green',
  warning: 'yellow',
  error: 'red',
  fatal: 'bgRed'
};

const allowedColors = [
  'bgBlack',
  'bgRed',
  'bgGreen',
  'bgYellow',
  'bgBlue',
  'bgMagenta',
  'bgCyan',
  'bgWhite',
  'bgBlackBright',
  'bgRedBright',
  'bgGreenBright',
  'bgYellowBright',
  'bgBlueBright',
  'bgMagentaBright',
  'bgCyanBright',
  'bgWhiteBright'
];

// these are known as "placeholder tokens", see this link for more info:
// <https://nodejs.org/api/util.html#util_util_format_format_args>
//
// since they aren't exposed (or don't seem to be) by node (at least not yet)
// we just define an array that contains them for now
// <https://github.com/nodejs/node/issues/17601>
const tokens = ['%s', '%d', '%i', '%f', '%j', '%o', '%O', '%%'];

class Logger {
  constructor(config = {}) {
    autoBind(this);

    // debugName gets passed to logger.debug
    this.config = Object.assign(
      {
        appName: '@ladjs/logger',
        showStack: false,
        silent: false,
        processName: null,
        processColor: 'bgCyan'
      },
      config
    );

    if (
      this.config.processColor &&
      !allowedColors.includes(this.config.processColor)
    )
      throw new Error(
        `Invalid color ${
          this.config.processColor
        }, must be one of ${allowedColors.join(', ')}`
      );

    // bind helper functions for each log level
    const log = this.log;
    _.keys(levels).forEach(level => {
      this[level] = function() {
        log(...[level].concat([].slice.call(arguments)));
      };
    });

    // aliases
    this.err = this.error;
    this.warn = this.warning;
  }

  // TODO: rewrite this with better log parsing by cabin
  contextError(err) {
    // , ctx) {
    // TODO: add user object and request to meta here using `ctx` arg
    this.error(err);
  }

  log(level, message, meta = {}) {
    const { config } = this;

    if (level === 'warn') level = 'warning';
    if (level === 'err') level = 'error';

    if (!_.isString(level) || !_.includes(_.keys(levels), level)) {
      throw new Error(
        `\`level\` must be a string and one of ${_.keys(levels).join(', ')}`
      );
    }

    // if there are four or more args
    // then infer to use util.format on everything
    if (arguments.length >= 4) {
      message = format(...[].slice.call(arguments).slice(1));
      meta = {};
    } else if (
      arguments.length === 3 &&
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

    if (_.isError(message)) {
      if (!_.isObject(meta.err))
        meta.err = { stack: message.stack, message: message.message };
      message = message.message;
    }

    // set default level on meta
    meta.level = level;

    // TODO: send to cabin here
    // if (config.env === 'production') cabin.log(message, meta);

    // Suppress logs if it was silent
    if (config.silent) return;

    if (level === 'debug') {
      let name = config.processName;
      if (!name && require.main && require.main.filename)
        name = require.main.filename;
      if (!name) name = '@ladjs/logger';
      debug(name)(message, _.omit(meta, 'level'));
    } else {
      let prepend = '';
      if (config.processName) {
        const color = chalk[config.processColor].bold;
        prepend = `${color(`[${config.processName}]`)} `;
      }
      console.log(`${prepend}${chalk[levels[level]](level)}: ${message}`);

      // if there was meta information then output it
      if (!_.isEmpty(_.omit(meta, ['level', 'err'])))
        console.log(_.omit(meta, ['level', 'err']));

      // if we're not showing the stack trace then return early
      if (!config.showStack) return;

      // output the stack trace to the console for debugging
      if (meta.err && meta.err.stack) console.log(meta.err.stack);
    }
  }
}

Logger.levels = _.keys(levels);

module.exports = Logger;
