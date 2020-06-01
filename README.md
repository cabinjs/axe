# Axe

[![build status](https://img.shields.io/travis/cabinjs/axe.svg)](https://travis-ci.org/cabinjs/axe)
[![code coverage](https://img.shields.io/codecov/c/github/cabinjs/axe.svg)](https://codecov.io/gh/cabinjs/axe)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://github.com/lassjs/lass)
[![license](https://img.shields.io/github/license/cabinjs/axe.svg)](LICENSE)

> Logging add-on to send logs over HTTP to your server in Node and Browser environments. Works with any logger! Chop up your logs consistently! Made for [Cabin][].


## Table of Contents

* [Install](#install)
  * [Node](#node)
  * [Browser](#browser)
* [Approach](#approach)
* [Application Information](#application-information)
* [Usage](#usage)
  * [Node](#node-1)
  * [Browser](#browser-1)
  * [Custom logger](#custom-logger)
  * [Custom endpoint](#custom-endpoint)
  * [Suppress logs](#suppress-logs)
  * [Stack Traces and Error Handling](#stack-traces-and-error-handling)
* [Options](#options)
* [Aliases](#aliases)
* [Methods](#methods)
* [Send Logs To Slack](#send-logs-to-slack)
* [Contributors](#contributors)
* [Trademark Notice](#trademark-notice)
* [License](#license)


## Install

### Node

[npm][]:

```sh
npm install axe
```

[yarn][]:

```sh
yarn add axe
```

### Browser

See [Browser](#browser-1) usage below for more information.


## Approach

We adhere to the [Log4j][log4j] standard.  This means that you can use any [custom logger](#custom-logger) (or the default `console`), but we strictly support the following log levels:

* `trace`
* `debug`
* `info`
* `warn`
* `error`
* `fatal` (uses `error`)

We highly recommend that you follow this approach when logging `(message, meta)`:

```js
const message = 'Hello world';
const meta = { beep: 'boop', foo: true };
axe.info(message, meta);
```

You can also make logs with three arguments `(level, message, meta)`:

```js
const level = 'info';
const message = 'Hello world';
const meta = { beep: 'boop', foo: true };
axe.log(level, message, meta);
```

You should also log errors like this:

```js
const err = new Error('Oops!');
axe.error(err);
```

**To recap:** The first argument `message` should be a String, and the second `meta` should be an optional Object.

If you simply use `axe.log`, then the log level used will be `info`, but it will still use the logger's native `log` method (as opposed to using `info`).

If you invoke `axe.log` (or any other logging method, e.g. `info`), then it will return a consistent value no matter the edge case.

For example, if you log `axe.log('hello world')`, it will output with `console.log` (or your custom logger's `log` method) and `return` the Object:

```js
{ message: 'hello world', meta: { level: 'info' } }
```

And if you were to log `axe.info('hello world')`, it will output with `console.info` (or your custom logger's `info` method) and `return` the Object:

```js
{ message: 'hello world', meta: { level: 'info' } }
```

Lastly if you were to log `axe.warn('uh oh!', { amount_spent: 50 })`, it will output with `console.warn` (or your custom logger's `warn` method) and `return` the Object:

```js
{ message: 'uh oh!', meta: { amount_spent: 50, level: 'warn' } }
```

These returned values will be automatically sent to the endpoint (by default to your [Cabin][] account associated with your API key).

You can also use format specifiers in the browser (uses [format-util][] – has limited number of format specifiers) and Node (uses the built-in [util.format][] method – supports all format specifiers).  This feature is built-in thanks to smart detection using [format-specifiers][].

**This consistency among server and browser environments is the beauty of Axe – and when used in combination with [Cabin][], your logs will be beautiful with HTTP request information, user metadata, IP address, User-Agent, and more!**


## Application Information

By default a `meta.app` property is populated in all logs for you using [parse-app-info][].

At a glance, here are the properties that are automatically populated for you:

| Property    | Description                         |
| ----------- | ----------------------------------- |
| environment | The value of NODE_ENV               |
| hostname    | Name of the computer                |
| name        | Name of the app from `package.json` |
| node        | Version if node.js running the app  |
| pid         | Process ID as in `process.pid`      |
| version     | Version of the app `package.json`   |

Additional properties when the app is in a git repository

| Property | Description                                                        |
| -------- | ------------------------------------------------------------------ |
| hash     | git hash of latest commit if the app                               |
| tag      | the latest git tag. Property is not available when there is no tag |


## Usage

We highly recommend to simply use [Cabin][] as this package is built-in!

### Node

```js
const Axe = require('axe');

const axe = new Axe({ key: 'YOUR-CABIN-API-KEY' });

axe.info('hello world');
```

### Browser

#### VanillaJS

**The browser-ready bundle is only 36 KB (minified and gzipped)**.

```html
<script src="https://polyfill.io/v3/polyfill.min.js?features=es6,Map,Map.prototype,Math.sign,Promise,Reflect,Symbol,Symbol.iterator,Symbol.prototype,Symbol.toPrimitive,Symbol.toStringTag,Uint32Array,window.crypto,Object.assign,Object.getOwnPropertySymbols,Array.from"></script>
<script src="https://unpkg.com/axe"></script>
<script type="text/javascript">
  (function() {
    var Axe = new Axe({ key: 'YOUR-CABIN-API-KEY' });
    axe.info('hello world');
  });
</script>
```

#### Required Browser Features

We recommend using <https://polyfill.io> (specifically with the bundle mentioned in [VanillaJS](#vanillajs) above):

```html
<script src="https://polyfill.io/v3/polyfill.min.js?features=es6,Map,Map.prototype,Math.sign,Promise,Reflect,Symbol,Symbol.iterator,Symbol.prototype,Symbol.toPrimitive,Symbol.toStringTag,Uint32Array,window.crypto,Object.assign,Object.getOwnPropertySymbols,Array.from"></script>
```

* Map is not supported in IE 10
* Map.prototype() is not supported in IE 10
* Math.sign() is not supported in IE 10
* Promise is not supported in Opera Mobile 12.1, Opera Mini all, IE Mobile 10, IE 10, Blackberry Browser 7
* Reflect is not supported in IE 10
* Symbol is not supported in IE 10
* Symbol.iterator() is not supported in IE 10
* Symbol.prototype() is not supported in IE 10
* Symbol.toPrimitive() is not supported in IE 10
* Symbol.toStringTag() is not supported in IE 10
* Uint32Array is not supported in IE Mobile 10, IE 10, Blackberry Browser 7
* window.crypto() is not supported in IE 10
* Object.assign() is not supported in IE 10
* Object.getOwnPropertySymbols() is not supported in IE 10
* Array.from() is not supported in IE 10

#### Bundler

If you're using something like [browserify][], [webpack][], or [rollup][], then install the package as you would with [Node](#node) above.

### Custom logger

By default, Axe uses the built-in `console` (with [console-polyfill][] for cross-browser support).

However you might want to use something fancier, and as such we support _any_ logger out of the box.

Loggers supported include, but are not limited to:

* [consola][]
* [pino][]
* [signale][]
* [bunyan][]
* [winston][]
* [high-console][]

> Just pass your custom logging utility as the `logger` option:

```js
const signale = require('signale');
const Axe = require('axe');

const axe = new Axe({ logger: signale, key: 'YOUR-CABIN-API-KEY' });

axe.info('hello world');
```

In [Lad][], we have an approach similar to the following, where non-production environments use [consola][], and production environments use [pino][].

```js
const Axe = require('axe');
const consola = require('consola');
const pino = require('pino')({
  customLevels: {
    log: 30
  },
  hooks: {
    // <https://github.com/pinojs/pino/blob/master/docs/api.md#logmethod>
    logMethod(inputArgs, method) {
      return method.call(this, {
        // <https://github.com/pinojs/pino/issues/854>
        // message: inputArgs[0],
        msg: inputArgs[0],
        meta: inputArgs[1]
      });
    }
  }
});

const isProduction = process.env.NODE_ENV === 'production';
const logger = new Axe({
  logger: isProduction ? pino : consola
});

logger.info('hello world');
```

### Custom endpoint

By default we built-in support such that if you provide your [Cabin][] API key, then your logs will be uploaded automatically for you in both server and browser environments.

If you decide to [self-host your own Cabin API][cabin-api] (or roll your own logging service) then you can specify your own endpoint under `config.endpoint`.

See [Options](#options) below for more information.

### Suppress logs

This is useful when you want need logging turned off in certain environments.

For example when you're running tests you can set `axe.config.silent = true`.

```js
const Axe = require('axe');

const axe = new Axe({ silent: true, key: 'YOUR-CABIN-API-KEY' });

axe.info('hello world');
```

### Stack Traces and Error Handling

Please see Cabin's documentation for [stack traces and error handling](https://github.com/cabinjs/cabin#stack-traces-and-error-handling) for more information.

> If you're not using `cabin`, you can simply replace instances of the word `cabin` with `axe` in the documentation examples linked above.


## Options

* `key` (String) - defaults to an empty string, so BasicAuth is not used – **this is your Cabin API key**, which you can get for free at [Cabin][] (note you could provide your own API key here if you are self-hosting or rolling your own logging service)
* `endpoint` (String) - defaults to `https://api.cabinjs.com`
* `headers` (Object) - HTTP headers to send along with log to the `endpoint`
* `timeout` (Number) - defaults to `5000`, number of milliseconds to wait for a response
* `retry` (Number) - defaults to `3`, number of attempts to retry sending log over HTTP
* `showStack` (Boolean) - defaults to `true` (attempts to parse a boolean value from `process.env.SHOW_STACK`) - whether or not to output a stack trace
* `showMeta` (Boolean) - defaults to `true` (attempts to parse a boolean value from `process.env.SHOW_META` – meaning you can pass a flag `SHOW_META=true node app.js` when needed for debugging), whether or not to output metadata to logger methods
* `silent` (Boolean) - defaults to `false`, whether or not to suppress log output to console
* `logger` (Object) - defaults to `console` (with [console-polyfill][] added automatically), but you may wish to use a [custom logger](#custom-logger)
* `name` (String) - the default name for the logger (defaults to `false`, which does not set `logger.name`).  If you wish to pass a name such as `os.hostname()`, then set `name: os.hostname()` – this is useful if you are using a logger like `pino` which prefixes log output with the name set here.
* `level` (String) - the default level of logging to capture (defaults to `info`, which includes all logs including info and higher in severity (e.g. `info`, `warn`, `error`, `fatal`)
* `capture` (Boolean) - defaults to `false` in browser (all environments) and server-side (non-production only) environments, whether or not to `POST` logs to the `endpoint` (takes into consideration the `config.level` to only send valid capture levels
* `callback` (Function) - defaults to `false`, but if it is a `Function`, then it will be called with `callback(level, message, meta)` – this is super useful for [sending messages to Slack when errors occur (see below)](#send-logs-to-slack).  Note that if you specify `{ callback: false }` in the meta object when logging, it will prevent the callback function from being invoked (e.g. `axe.error(new Error('Slack callback failed'), { callback: false })` ‐ see below example).  The `callback` property is always purged from `meta` object for sanity.
* `appInfo` (Boolean) - defaults to `true` (attempts to parse a boolean value from `process.env.APP_INFO`) - whether or not to parse application information (using [parse-app-info][]).


## Aliases

We have provided helper/safety aliases for `logger.warn` and `logger.error` of `logger.warning` and `logger.err` respectively.


## Methods

Two extra methods are available, which were inspired by [Slack's logger][slack-logger] and added for compatibility:

* `axe.setLevel(level)` - sets the log `level` (String) severity to capture (must be valid enumerable level)
* `axe.getNormalizedLevel(level)` - gets the normalized log `level` (String) severity (normalizes to known logger levels, e.g. "warning" => "warn", "err" => "error", "log" => "info")
* `axe.setName(name)` - sets the `name` (String) property (some loggers like `pino` will prefix logs with the name set here)
* `axe.setCallback(callback)` - sets the `callback` (Function) property (see `callback` option above and [Slack example below](#send-logs-to-slack)


## Send Logs To Slack

This is just an example of using the `callback` option to send a message to Slack with errors that occur in your application:

1. You will need to install the `@slack/web-api` package locally:

   ```sh
   npm install @slack/web-api
   ```

2. Create and copy to your clipboard a new Slack bot token at <https://my.slack.com/services/new/bot>.

3. Implementation example is provided below:

   > Replace `INSERT-YOUR-TOKEN` with the token in your clipboard

   ```js
   const os = require('os');
   const Axe = require('axe');
   const { WebClient } = require('@slack/web-api');
   const signale = require('signale');
   const pino = require('pino')({
     customLevels: {
       log: 30
     },
     hooks: {
       // <https://github.com/pinojs/pino/blob/master/docs/api.md#logmethod>
       logMethod(inputArgs, method) {
         return method.call(this, {
           // <https://github.com/pinojs/pino/issues/854>
           // message: inputArgs[0],
           msg: inputArgs[0],
           meta: inputArgs[1]
         });
       }
     }
   });

   const isProduction = process.env.NODE_ENV === 'production';

   const config = {
     logger: isProduction ? pino : signale,
     level: isProduction ? 'warn' : 'info',
     name: process.env.HOSTNAME || os.hostname()
   };

   // custom logger for Slack that inherits our Axe config
   // (with the exception of a `callback` function for logging to Slack)
   const slackLogger = new Axe(config);

   // create an instance of the Slack Web Client API for posting messages
   const web = new WebClient('INSERT-YOUR-TOKEN', {
     // <https://slack.dev/node-slack-sdk/web-api#logging>
     logger: slackLogger,
     logLevel: config.level
   });

   // create our application logger that uses a custom callback function
   const axe = new Axe({ ...config });

   axe.setCallback(async (level, message, meta) => {
     try {
       // if it was not an error then return early
       if (!['error','fatal'].includes(level)) return;

       // otherwise post a message to the slack channel
       const result = await web.chat.postMessage({
         channel: 'general',
         username: 'Cabin',
         icon_emoji: ':evergreen_tree:',
         attachments: [
           {
             title: meta.err && meta.err.message ? meta.err.message : message,
             color: 'danger',
             text: meta.err && meta.err.stack ? meta.err.stack : null,
             fields: [
               {
                 title: 'Level',
                 value: meta.level,
                 short: true
               },
               {
                 title: 'Environment',
                 value: meta.app.environment,
                 short: true
               },
               {
                 title: 'Hostname',
                 value: meta.app.hostname,
                 short: true
               },
               {
                 title: 'Hash',
                 value: meta.app.hash,
                 short: true
               }
             ]
           }
         ]
       });

       // finally log the result from slack
       axe.info('web.chat.postMessage', { result, callback: false });
     } catch (err) {
       axe.error(err, { callback: false });
     }
   });

   axe.error(new Error('Uh oh something went wrong!'));
   ```


## Contributors

| Name             | Website                   |
| ---------------- | ------------------------- |
| **Nick Baugh**   | <http://niftylettuce.com> |
| **Alexis Tyler** | <https://wvvw.me/>        |


## Trademark Notice

Axe, Lad, Lass, and their respective logos are trademarks of Niftylettuce LLC.
These trademarks may not be reproduced, distributed, transmitted, or otherwise used, except with the prior written permission of Niftylettuce LLC.
If you are seeking permission to use these trademarks, then please [contact us](mailto:niftylettuce@gmail.com).


## License

[MIT](LICENSE) © [Nick Baugh](http://niftylettuce.com)


## 

[npm]: https://www.npmjs.com/

[yarn]: https://yarnpkg.com/

[lad]: https://lad.js.org/

[cabin]: https://cabinjs.com/

[browserify]: https://github.com/browserify/browserify

[webpack]: https://github.com/webpack/webpack

[rollup]: https://github.com/rollup/rollup

[signale]: https://github.com/klauscfhq/signale

[high-console]: https://github.com/tusharf5/high-console

[pino]: https://github.com/pinojs/pino

[winston]: https://github.com/winstonjs/winston

[bunyan]: https://github.com/trentm/node-bunyan

[console-polyfill]: https://github.com/paulmillr/console-polyfill

[cabin-api]: https://github.com/cabinjs/api.cabinjs.com

[consola]: https://github.com/nuxt/consola

[log4j]: https://en.wikipedia.org/wiki/Log4

[parse-app-info]: https://github.com/cabinjs/parse-app-info

[slack-logger]: https://github.com/slackapi/node-slack-sdk/tree/master/packages/logger

[format-util]: https://github.com/tmpfs/format-util

[util.format]: https://nodejs.org/api/util.html#util_util_format_format_args

[format-specifiers]: https://github.com/niftylettuce/format-specifiers
