# Axe

[![build status](https://img.shields.io/travis/cabinjs/axe.svg)](https://travis-ci.org/cabinjs/axe)
[![code coverage](https://img.shields.io/codecov/c/github/cabinjs/axe.svg)](https://codecov.io/gh/cabinjs/axe)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://github.com/lassjs/lass)
[![license](https://img.shields.io/github/license/cabinjs/axe.svg)](<>)

> Logging add-on to send logs over HTTP to your server in Node and Browser environments. Works with any logger! Chop up your logs consistently! Made for [Cabin][] and [Lad][].


## Table of Contents

* [Install](#install)
  * [Node](#node)
  * [Browser](#browser)
* [Approach](#approach)
* [Usage](#usage)
  * [Basic](#basic)
  * [Custom logger](#custom-logger)
  * [Custom endpoint](#custom-endpoint)
  * [Suppress logs](#suppress-logs)
  * [Stack Traces and Error Handling](#stack-traces-and-error-handling)
* [Options](#options)
* [Aliases](#aliases)
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

#### VanillaJS

```html
<script src="https://unpkg.com/axe"></script>
<script type="text/javascript">
  (function() {
    var Axe = new Axe({ key: 'YOUR-CABIN-API-KEY' });
    axe.info('hello world');
  });
</script>
```

#### Bundler

If you're using something like [browserify][], [webpack][], or [rollup][], then install the package as you would with [Node](#node) above.


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

**This consistency among server and browser environments is the beauty of Axe – and when used in combination with [Cabin][], your logs will be beautiful with HTTP request information, user metadata, IP address, User-Agent, and more!**


## Usage

### Basic

```js
const Axe = require('axe');

const axe = new Axe({ key: 'YOUR-CABIN-API-KEY' });

axe.info('hello world');
```

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
const pino = require('pino')();

const isProduction = process.env.NODE_ENV === 'production';
const logger = new Axe({
  logger: isProduction ? pino : consola,
  capture: false
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
* `showStack` (Boolean) - defaults to `true` in non-production environments (attempts to parse a boolean value from `process.env.SHOW_STACK`), whether or not to output a stack trace
* `showMeta` (Boolean) - defaults to `false` (attempts to parse a boolean value from `process.env.SHOW_META` – meaning you can pass a flag `SHOW_META=true node app.js` when needed for debugging), whether or not to output metadata to logger methods
* `silent` (Boolean) - defaults to `false`, whether or not to suppress log output to console
* `logger` (Object) - defaults to `console` (with [console-polyfill][] added automatically), but you may wish to use a [custom logger](#custom-logger)
* `levels` (Array) - an Array of levels to capture (defaults to `[ 'info', 'warn', 'error', 'fatal' ]`
* `capture` (Boolean) - defaults to `false` in non-production environments, whether or not to `POST` logs to the `endpoint` (takes into consideration the `config.levels` to only send valid capture levels)


## Aliases

We have provided helper/safety aliases for `logger.warn` and `logger.error` of `logger.warning` and `logger.err` respectively.


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
