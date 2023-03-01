# Axe

[![build status](https://github.com/cabinjs/axe/actions/workflows/ci.yml/badge.svg)](https://github.com/cabinjs/axe/actions/workflows/ci.yml)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://github.com/lassjs/lass)
[![license](https://img.shields.io/github/license/cabinjs/axe.svg)](LICENSE)
[![npm downloads](https://img.shields.io/npm/dt/axe.svg)](https://npm.im/axe)

> Axe is a logger-agnostic wrapper that normalizes logs regardless of argument style. Great for large development teams, old and new projects, and works with Pino, Bunyan, Winston, console, and more. It is lightweight, performant, highly-configurable, and automatically adds OS, CPU, and Git information to your logs. It supports hooks (useful for masking sensitive data) and dot-notation remapping, omitting, and picking of log metadata properties. Made for [Forward Email][forward-email], [Lad][], and [Cabin][].


## Table of Contents

* [Foreword](#foreword)
* [Application Metadata and Information](#application-metadata-and-information)
* [Install](#install)
  * [Node](#node)
  * [Browser](#browser)
* [Usage](#usage)
  * [Options](#options)
  * [Suppress Console Output and Logger Invocation](#suppress-console-output-and-logger-invocation)
  * [Supported Platforms](#supported-platforms)
  * [Node](#node-1)
  * [Browser](#browser-1)
  * [Custom logger](#custom-logger)
  * [Silent Logging](#silent-logging)
  * [Stack Traces and Error Handling](#stack-traces-and-error-handling)
  * [Hooks](#hooks)
  * [Symbols](#symbols)
  * [Remapping](#remapping)
  * [Omitting](#omitting)
  * [Picking](#picking)
  * [Aliases](#aliases)
  * [Methods](#methods)
* [Examples](#examples)
  * [Send Logs to HTTP Endpoint](#send-logs-to-http-endpoint)
  * [Send Logs to Slack](#send-logs-to-slack)
  * [Send Logs to Sentry](#send-logs-to-sentry)
  * [Send Logs to Datadog](#send-logs-to-datadog)
  * [Send Logs to Papertrail](#send-logs-to-papertrail)
  * [Suppress Logger Data](#suppress-logger-data)
* [Contributors](#contributors)
* [License](#license)


## Foreword

Axe was built to provide consistency among development teams when it comes to logging. You not only have to worry about your development team using the same approach to writing logs and debugging applications, but you also have to consider that open-source maintainers implement logging differently in their packages.

There is no industry standard as to logging style, and developers mix and match arguments without consistency. For example, one developer may use the approach of `console.log('someVariable', someVariable)` and another developer will simply write `console.log(someVariable)`. Even if both developers wrote in the style of `console.log('someVariable', someVariable)`, there still could be an underlying third-party package that logs differently, or uses an entirely different approach. Furthermore, by default there is no consistency of logs with stdout or using any third-party hosted logging dashboard solution. It will also be almost impossible to spot logging outliers as it would be too time intensive.

No matter how your team or underlying packages style arguments when invoked with logger methods, Axe will clean it up and normalize it for you. This is especially helpful as you can see outliers much more easily in your logging dashboards, and pinpoint where in your application you need to do a better job of logging at. Axe makes your logs consistent and organized.

Axe is highly configurable and has built-in functionality to remap, omit, and pick metadata fields with dot-notation support. Instead of using [slow functions](https://medium.com/nerd-for-tech/replacing-lodash-omit-using-object-restructuring-and-the-spread-syntax-d7af1607a390) like `lodash`'s `omit`, we use a more performant approach.

Axe adheres to the [Log4j][log4j] log levels, which have been established for 21+ years (since 2001). This means that you can use any [custom logger](#custom-logger) (or the default `console`), but we strictly support the following log levels:

* `trace`
* `debug`
* `info`
* `warn`
* `error`
* `fatal`

Axe normalizes invocation of logger methods to be called with *only* two arguments: a String or Error as the first argument and an Object as the second argument. These two arguments are referred to as "message" and "meta" respectively. For example, if you're simply logging a message and some other information:

```js
logger.info('Hello world', { beep: 'boop', foo: true });
// Hello world { beep: 'boop', foo: true }
```

Or if you're logging a user, or a variable in general:

```js
logger.info('user', { user: { id: '1' } });
// user { user: { id: '1' } }
```

```js
logger.info('someVariable', { someVariable: true });
// someVariable { someVariable: true }
```

You might write logs with three arguments `(level, message, meta)` using the `log` method of Axe's returned `logger` instance:

```js
logger.log('info', 'Hello world', { beep: 'boop', foo: true });
// Hello world { beep: 'boop', foo: true }
```

Logging errors is just the same as you might do now:

```js
logger.error(new Error('Oops!'));

// Error: Oops!
//     at REPL3:1:14
//     at Script.runInThisContext (node:vm:129:12)
//     at REPLServer.defaultEval (node:repl:566:29)
//     at bound (node:domain:421:15)
//     at REPLServer.runBound [as eval] (node:domain:432:12)
//     at REPLServer.onLine (node:repl:893:10)
//     at REPLServer.emit (node:events:539:35)
//     at REPLServer.emit (node:domain:475:12)
//     at REPLServer.Interface._onLine (node:readline:487:10)
//     at REPLServer.Interface._line (node:readline:864:8)
```

You might log errors like this:

```js
logger.error(new Error('Oops!'), new Error('Another Error!'));

// Error: Oops!
//     at Object.<anonymous> (/Users/user/Projects/axe/test.js:5:14)
//     at Module._compile (node:internal/modules/cjs/loader:1105:14)
//     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1159:10)
//     at Module.load (node:internal/modules/cjs/loader:981:32)
//     at Function.Module._load (node:internal/modules/cjs/loader:822:12)
//     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:77:12)
//     at node:internal/main/run_main_module:17:47
//
// Error: Another Error!
//     at Object.<anonymous> (/Users/user/Projects/axe/test.js:5:34)
//     at Module._compile (node:internal/modules/cjs/loader:1105:14)
//     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1159:10)
//     at Module.load (node:internal/modules/cjs/loader:981:32)
//     at Function.Module._load (node:internal/modules/cjs/loader:822:12)
//     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:77:12)
//     at node:internal/main/run_main_module:17:47
```

Or even multiple errors:

```js
logger.error(new Error('Oops!'), new Error('Another Error!'), new Error('Woah!'));

// Error: Oops!
//     at Object.<anonymous> (/Users/user/Projects/axe/test.js:6:3)
//     at Module._compile (node:internal/modules/cjs/loader:1105:14)
//     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1159:10)
//     at Module.load (node:internal/modules/cjs/loader:981:32)
//     at Function.Module._load (node:internal/modules/cjs/loader:822:12)
//     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:77:12)
//     at node:internal/main/run_main_module:17:47
//
// Error: Another Error!
//     at Object.<anonymous> (/Users/user/Projects/axe/test.js:7:3)
//     at Module._compile (node:internal/modules/cjs/loader:1105:14)
//     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1159:10)
//     at Module.load (node:internal/modules/cjs/loader:981:32)
//     at Function.Module._load (node:internal/modules/cjs/loader:822:12)
//     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:77:12)
//     at node:internal/main/run_main_module:17:47
//
// Error: Woah!
//     at Object.<anonymous> (/Users/user/Projects/axe/test.js:8:3)
//     at Module._compile (node:internal/modules/cjs/loader:1105:14)
//     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1159:10)
//     at Module.load (node:internal/modules/cjs/loader:981:32)
//     at Function.Module._load (node:internal/modules/cjs/loader:822:12)
//     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:77:12)
//     at node:internal/main/run_main_module:17:47
```

As you can see, Axe combines multiple errors into one – for an easy to read stack trace.

If you simply use `logger.log`, then the log level used will be `info`, but it will still use the logger's native `log` method (as opposed to using `info`). If you invoke `logger.log` (or any other logging method, e.g. `logger.info`, `logger.warn`, or `logger.error`), then it will consistently invoke the internal logger with these two arguments.

```js
logger.log('hello world');
// hello world
```

```js
logger.info('hello world');
// hello world
```

```js
logger.warn('uh oh!', { amount_spent: 50 });
// uh oh! { amount_spent: 50 }
```

As you can see - this is exactly what you'd want your logger output to look like. Axe doesn't change anything out of the ordinary. Now here is where Axe is handy - **it will automatically normalize argument style for you:**

```js
logger.warn({ hello: 'world' }, 'uh oh');
// uh oh { hello: 'world' }
```

```js
logger.warn('uh oh', 'foo bar', 'beep boop');
// uh oh foo bar beep boop
```

```js
logger.warn('hello', new Error('uh oh!'));

// Error: uh oh!
//     at Object.<anonymous> (/Users/user/Projects/axe/test.js:5:22)
//     at Module._compile (node:internal/modules/cjs/loader:1105:14)
//     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1159:10)
//     at Module.load (node:internal/modules/cjs/loader:981:32)
//     at Function.Module._load (node:internal/modules/cjs/loader:822:12)
//     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:77:12)
//     at node:internal/main/run_main_module:17:47
```

```js
logger.warn(new Error('uh oh!'), 'hello');

// Error: uh oh!
//     at Object.<anonymous> (/Users/user/Projects/axe/test.js:9:13)
//     at Module._compile (node:internal/modules/cjs/loader:1105:14)
//     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1159:10)
//     at Module.load (node:internal/modules/cjs/loader:981:32)
//     at Function.Module._load (node:internal/modules/cjs/loader:822:12)
//     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:77:12)
//     at node:internal/main/run_main_module:17:47
```

Axe has support for format specifiers, and you can even use format specifiers in the browser (uses [format-util][] – has limited number of format specifiers) and Node (uses the built-in [util.format][] method – supports all format specifiers). This feature is built-in thanks to smart detection using [format-specifiers][].

```js
logger.info('favorite color is %s', 'blue');
// favorite color is blue
```

As you can see, Axe makes your logs consistent in both Node and browser environments.

Axe's goal is to allow you to log in any style, but make your log output more readable, organized, and clean.

The **most impactful feature of Axe** is that it **makes logger output human-friendly and readable** when there are multiple errors.

Normally `console` output (and most other loggers) by default will output the following unreadable stack trace:

```sh
> console.log(new Error('hello'), new Error('world'));
Error: hello
    at REPL6:1:13
    at Script.runInThisContext (node:vm:129:12)
    at REPLServer.defaultEval (node:repl:566:29)
    at bound (node:domain:421:15)
    at REPLServer.runBound [as eval] (node:domain:432:12)
    at REPLServer.onLine (node:repl:893:10)
    at REPLServer.emit (node:events:539:35)
    at REPLServer.emit (node:domain:475:12)
    at REPLServer.Interface._onLine (node:readline:487:10)
    at REPLServer.Interface._line (node:readline:864:8) Error: world
    at REPL6:1:33
    at Script.runInThisContext (node:vm:129:12)
    at REPLServer.defaultEval (node:repl:566:29)
    at bound (node:domain:421:15)
    at REPLServer.runBound [as eval] (node:domain:432:12)
    at REPLServer.onLine (node:repl:893:10)
    at REPLServer.emit (node:events:539:35)
    at REPLServer.emit (node:domain:475:12)
    at REPLServer.Interface._onLine (node:readline:487:10)
    at REPLServer.Interface._line (node:readline:864:8)
```

However with Axe, errors and stack traces are much more readable (we use [maybe-combine-errors][] under the hood):

```sh
> logger.log(new Error('hello'), new Error('world'));
Error: hello
    at REPL7:1:12
    at Script.runInThisContext (node:vm:129:12)
    at REPLServer.defaultEval (node:repl:566:29)
    at bound (node:domain:421:15)
    at REPLServer.runBound [as eval] (node:domain:432:12)
    at REPLServer.onLine (node:repl:893:10)
    at REPLServer.emit (node:events:539:35)
    at REPLServer.emit (node:domain:475:12)
    at REPLServer.Interface._onLine (node:readline:487:10)
    at REPLServer.Interface._line (node:readline:864:8)

Error: world
    at REPL7:1:32
    at Script.runInThisContext (node:vm:129:12)
    at REPLServer.defaultEval (node:repl:566:29)
    at bound (node:domain:421:15)
    at REPLServer.runBound [as eval] (node:domain:432:12)
    at REPLServer.onLine (node:repl:893:10)
    at REPLServer.emit (node:events:539:35)
    at REPLServer.emit (node:domain:475:12)
    at REPLServer.Interface._onLine (node:readline:487:10)
    at REPLServer.Interface._line (node:readline:864:8)
```

Lastly, Axe works in both server-side and client-side environments (with Node and the browser).


## Application Metadata and Information

If you've read the [Foreword](#foreword), you'll know that Axe invokes logger methods with two normalized arguments, `message` (String or Error) and `meta` (Object).

Axe will automatically add the following metadata and information to the `meta` Object argument passed to logger methods:

| Property                  | Type   | Description                                                                                                                                                         |
| ------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `meta.level`              | String | The log level invoked (e.g. `"info"`).                                                                                                                              |
| `meta.err`                | Object | Parsed error information using [parse-err][].                                                                                                                       |
| `meta.original_err`       | Object | If and only if `meta.err` already existed, this field is preserved as `meta.original_err` on the metadata object.                                                   |
| `meta.original_meta`      | Object | If and only if `meta` already existed as an argument and was not an Object (e.g. an Array), this field is preserved as `meta.original_meta` on the metadata object. |
| `meta.app`                | Object | Application information parsed using [parse-app-info][]. **This is not added in Browser environments.** See below nested properties.                                |
| `meta.app.name`           | String | Name of the app from `package.json`.                                                                                                                                |
| `meta.app.version`        | String | Version of the app `package.json`.                                                                                                                                  |
| `meta.app.node`           | String | Version if node.js running the app.                                                                                                                                 |
| `meta.app.hash`           | String | The latest Git commit hash; not available when not in a Git repository or if there is no Git commit hash.                                                           |
| `meta.app.tag`            | String | The latest Git tag; not available when not in a Git repository or if there is no Git tag.                                                                           |
| `meta.app.environment`    | String | The value of `process.env.NODE_ENV`.                                                                                                                                |
| `meta.app.hostname`       | String | Name of the computer.                                                                                                                                               |
| `meta.app.pid`            | Number | Process ID as in `process.pid`.                                                                                                                                     |
| `meta.app.cluster`        | Object | Node [cluster](https://nodejs.org/api/cluster.html) information.                                                                                                    |
| `meta.app.os`             | Object | Node [os](https://nodejs.org/api/os.html) information.                                                                                                              |
| `meta.app.worker_threads` | Object | Node [worker_threads](https://nodejs.org/api/worker_threads.html) information.                                                                                      |

**As of v11.0.0** Axe will output `meta.app` by default unless you pass `omittedFields: [ 'app' ]` or specify the process environment variable of `AXE_OMIT_META_FIELDS=app node app.js` when you start your app.

Axe will omit from metadata all properties via the default Array from `meta.omittedFields` option (see [Options](#options) below for more insight).

If the argument "meta" is an empty object, then it will not be passed as an argument to logger methods \*ndash; because you don't want to see an empty `{}` polluting your log metadata. Axe keeps your log output tidy.

```sh
hello world {
  level: 'info',
  app: {
    name: 'axe',
    version: '10.0.0',
    node: 'v16.15.1',
    hash: '5ecd389b2523a8e810416f6c4e3ffa0ba6573dc2',
    tag: 'v10.0.0',
    environment: 'development',
    hostname: 'users-MacBook-Air.local',
    pid: 3477,
    cluster: { isMaster: true, isWorker: false, schedulingPolicy: 2 },
    os: {
      arch: 'arm64',
      cpus: [Array],
      endianness: 'LE',
      freemem: 271433728,
      priority: 0,
      homedir: '/Users/user',
      hostname: 'users-MacBook-Air.local',
      loadavg: [Array],
      network_interfaces: [Object],
      platform: 'darwin',
      release: '21.3.0',
      tmpdir: '/var/folders/rl/gz_3j8fx4s98k2kb0hknfygm0000gn/T',
      totalmem: 17179869184,
      type: 'Darwin',
      uptime: 708340,
      user: [Object],
      version: 'Darwin Kernel Version 21.3.0: Wed Dec  8 00:40:46 PST 2021; root:xnu-8019.80.11.111.1~1/RELEASE_ARM64_T8101'
    },
    worker_threads: {
      isMainThread: true,
      resourceLimits: {},
      threadId: 0,
      workerData: null
    }
  }
}
```

Note that you can also combine `meta.omittedFields` with `meta.pickedFields` and `meta.remappedFields` (in case you want to output specific properties from `meta.app` and exclude others – see [Options](#options) for more insight).


## Install

### Node

[npm][]:

```sh
npm install axe
```

### Browser

See [Browser](#browser-1) usage below for more information.


## Usage

### Options

| Property                | Type              | Default Value                                                                                             | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |   |
| ----------------------- | ----------------- | --------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | - |
| `showStack`             | Boolean           | `true`                                                                                                    | Attempts to parse a boolean value from `process.env.AXE_SHOW_STACK`). **If this value is `true`, then if `message` is an instance of an Error, it will be invoked as the first argument to logger methods. If this is `false`, then only the `err.message` will be invoked as the first argument to logger methods.** Basically if `true` it will call `logger.method(err)` and if `false` it will call `logger.method(err.message)`. If you pass `err` as the first argument to a logger method, then it will show the stack trace via `err.stack` typically. |   |
| `meta`                  | Object            | See below                                                                                                 | Stores all meta config information (see the following nested properties below).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |   |
| `meta.show`             | Boolean           | `true`                                                                                                    | Attempts to parse a boolean value from `process.env.AXE_SHOW_META` – meaning you can pass a flag `AXE_SHOW_META=true node app.js` when needed for debugging), whether or not to output metadata to logger methods. If set to `false`, then fields will not be omitted nor picked; the entire meta object will be hidden from logger output.                                                                                                                                                                                                                    |   |
| `meta.remappedFields`   | Object            | `{}`                                                                                                      | Attempts to parse an Object mapping from `process.env.AXE_REMAPPED_META_FIELDS` (`,` and `:` delimited, e.g. `REMAPPED_META_FIELDS=foo:bar,beep.boop:beepBoop` to remap `meta.foo` to `meta.bar` and `meta.beep.boop` to `meta.beepBoop`). Note that this will clean up empty objects by default unless you set the option `meta.cleanupRemapping` to `false`). Supports dot-notation.                                                                                                                                                                         |   |
| `meta.omittedFields`    | Array             | `[]`                                                                                                      | Attempts to parse an array value from `process.env.AXE_OMIT_META_FIELDS` (`,` delimited) - meaning you can pass a flag `AXE_OMIT_META_FIELDS=user,id node app.js`), determining which fields to omit in the metadata passed to logger methods. Supports dot-notation.                                                                                                                                                                                                                                                                                          |   |
| `meta.pickedFields`     | Array             | `[]`                                                                                                      | Attempts to parse an array value from `process.env.AXE_PICK_META_FIELDS` (`,` delimited) - meaning you can pass a flag, e.g. `AXE_PICK_META_FIELDS=request.headers,response.headers node app.js` which would pick from `meta.request` and `meta.response` *only* `meta.request.headers` and `meta.response.headers`), **This takes precedence after fields are omitted, which means this acts as a whitelist.** Supports dot-notation.  **As of v11.2.0 this now supports Symbols, but only top-level symbols via `Reflect.ownKeys` (not recursive yet).**     |   |
| `meta.cleanupRemapping` | Boolean           | `true`                                                                                                    | Whether or not to cleanup empty objects after remapping operations are completed)                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |   |
| `meta.hideHTTP`         | Boolean           | `true`                                                                                                    | Whether to suppress HTTP metadata (prevents logger invocation with second arg `meta`) if `meta.is_http` is `true` (via [parse-request][] v5.1.0+).  If you manually set `meta.is_http = true` and this is `true`, then `meta` arg will be suppressed as well.                                                                                                                                                                                                                                                                                                  |   |
| `meta.hideMeta`         | String or Boolean | `"hide_meta"`                                                                                             | If this value is provided as a String, then if `meta[config.hideMeta]` is `true`, it will suppress the entire metadata object `meta` (the second arg) from being passed/invoked to the logger.  This is useful when you want to suppress metadata from the logger invocation, but still persist it to post hooks (e.g. for sending upstream to your log storage provider). This helps to keep development and production console output clean while also allowing you to still store the meta object.                                                          |   |
| `silent`                | Boolean           | `false`                                                                                                   | Whether or not to invoke logger methods. Pre and post hooks will still run even if this option is set to `false`.                                                                                                                                                                                                                                                                                                                                                                                                                                              |   |
| `logger`                | Object            | `console`                                                                                                 | Defaults to `console` with [console-polyfill][] added automatically, though **you can bring your own logger**. See [custom logger](#custom-logger) – you can pass an instance of `pino`, `signale`, `winston`, `bunyan`, etc.                                                                                                                                                                                                                                                                                                                                  |   |
| `name`                  | String or Boolean | `false` if `NODE_ENV` is `"development"` otherwise the value of `process.env.HOSTNAME` or `os.hostname()` | The default name for the logger (defaults to `false` in development environments, which does not set `logger.name`) – this is useful if you are using a logger like `pino` which prefixes log output with the name set here.                                                                                                                                                                                                                                                                                                                                   |   |
| `level`                 | String            | `"info"`                                                                                                  | The default level of logging to invoke `logger` methods for (defaults to `info`, which includes all logs including info and higher in severity (e.g. `info`, `warn`, `error`, `fatal`)                                                                                                                                                                                                                                                                                                                                                                         |   |
| `levels`                | Array             | `['info','warn','error','fatal']`                                                                         | An Array of logging levels to support. You usually shouldn't change this unless you want to prevent logger methods from being invoked or prevent hooks from being run for a certain log level. If an invalid log level is attempted to be invoked, and if it is not in this Array, then no hooks and no logger methods will be invoked.                                                                                                                                                                                                                        |   |
| `appInfo`               | Boolean           | `true`                                                                                                    | Attempts to parse a boolean value from `process.env.AXE_APP_INFO`) - whether or not to parse application information (using [parse-app-info][]).                                                                                                                                                                                                                                                                                                                                                                                                               |   |

### Suppress Console Output and Logger Invocation

If you wish to suppress console output (e.g. prevent logger invocation) for a specific log – you can do so by setting a special property to have a `true` value in the meta object.

This special property is a Symbol via `Symbol.for('axe.silent')`.  Using a Symbol will prevent logs from being suppressed inadvertently (e.g. if a meta object contained `is_silent: true` however you did not explicitly set `is_silent: true`, as it might have been the result of another package or Object parsed.

To do so, simply declare `const silentSymbol = Symbol.for('axe.silent')` and then use it as follows:

```js
const Axe = require('axe');

const silentSymbol = Symbol.for('axe.silent');

const logger = new Axe();

logger.info('hello world');                           // <--- outputs to console "hello world"
logger.info('hello world', { [silentSymbol]: true }); // <--- **does not output to console**
```

Pre and post hooks will still run whether this is set to true or not – this is simply only for logger method invocation.

Another common use case for this is to suppress console output for HTTP asset requests that are successful.

Note that the example provided below assumes you are using [Cabin's middleware][cabin] which parses HTTP requests into the `meta` Object properly:

```js
const Axe = require('axe');

const silentSymbol = Symbol.for('axe.silent');

const logger = new Axe();

const IGNORED_CONTENT_TYPES = [
  'application/javascript; charset=utf-8',
  'application/manifest+json',
  'font',
  'image',
  'text/css'
];

//
// set the silent symbol in axe to true for successful asset responses
//
for (const level of logger.config.levels) {
  logger.pre(level, function (err, message, meta) {
    if (
      meta.is_http &&
      meta.response &&
      meta.response.status_code &&
      meta.response.status_code < 400 &&
      (meta.response.status_code === 304 ||
        (meta.response.headers &&
          meta.response.headers['content-type'] &&
          IGNORED_CONTENT_TYPES.some((c) =>
            meta.response.headers['content-type'].startsWith(c)
          )))
    )
      meta[silentSymbol] = true;
    return [err, message, meta];
  });
}
```

### Supported Platforms

* Node: v14+
* Browsers (see [.browserslistrc](.browserslistrc)):

  ```sh
  npx browserslist
  ```

  ```sh
  and_chr 107
  and_ff 106
  and_qq 13.1
  and_uc 13.4
  android 107
  chrome 107
  chrome 106
  chrome 105
  edge 107
  edge 106
  edge 105
  firefox 106
  firefox 105
  firefox 102
  ios_saf 16.1
  ios_saf 16.0
  ios_saf 15.6
  ios_saf 15.5
  ios_saf 14.5-14.8
  kaios 2.5
  op_mini all
  op_mob 64
  opera 91
  opera 90
  safari 16.1
  safari 16.0
  safari 15.6
  samsung 18.0
  samsung 17.0
  ```

### Node

```js
const Axe = require('axe');

const logger = new Axe();

logger.info('hello world');
```

### Browser

This package requires Promise support, therefore you will need to polyfill if you are using an unsupported browser (namely Opera mini).

**We no longer support IE as of Axe v10.0.0+.**

#### VanillaJS

**The browser-ready bundle is only 18 KB when minified and 6 KB when gzipped**.

```html
<script src="https://polyfill.io/v3/polyfill.min.js?features=Promise"></script>
<script src="https://unpkg.com/axe"></script>
<script type="text/javascript">
  (function () {
    // make a new logger instance
    const logger = new Axe();
    logger.info('hello world');

    // or you can override console everywhere
    console = new Axe();
    console.info('hello world');
  });
</script>
```

#### Required Browser Features

We recommend using <https://polyfill.io> (specifically with the bundle mentioned in [VanillaJS](#vanillajs) above):

```html
<script src="https://polyfill.io/v3/polyfill.min.js?features=Promise"></script>
```

* Promise is not supported in op\_mini all

#### Bundler

If you're using something like [browserify][], [webpack][], or [rollup][], then install the package as you would with [Node](#node) above.

### Custom logger

By default, Axe uses the built-in `console` (with [console-polyfill][] for cross-browser support).

However you might want to use something fancier, and as such we support *any* logger out of the box.

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

const logger = new Axe({ logger: signale });

logger.info('hello world');
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

### Silent Logging

Silent logging is useful when you need to disable logging in certain environments for privacy reasons or to simply clean up output on stdout.

For example when you're running tests you can set `logger.config.silent = true`.

```js
const Axe = require('axe');

const logger = new Axe({ silent: true });

logger.info('hello world');
```

### Stack Traces and Error Handling

Please see Cabin's documentation for [stack traces and error handling](https://github.com/cabinjs/cabin#stack-traces-and-error-handling) for more information.

> If you're not using `cabin`, you can simply replace instances of the word `cabin` with `axe` in the documentation examples linked above.

### Hooks

You can add synchronous "pre" hooks and/or asynchronous/synchronous "post" hooks with Axe. Both pre and post hooks accept four arguments (`level`, `err`, `message`, and `meta`). Pre hooks are required to be synchronous.  Pre hooks also run before any metadata is picked, omitted, remapped, etc.

Both pre and post hooks execute serially – and while pre hooks are blocking, post-hooks will run in the background after logger methods are invoked (you can have a post hook that's a Promise or async function).

Pre hooks require an Array to be returned of `[ err, message, meta ]`.

Pre hooks allow you to manipulate the arguments `err`, `message`, and `meta` that are passed to the internal logger methods. This is useful for masking sensitive data or doing additional custom logic before writing logs.

Post hooks are useful if you want to send logging information to a third-party, store them into a database, or do any sort of custom processing.

As of v12, logger invocation (e.g. `logger.info('hello')`) will return their post hooks as a Promise – which means you can `await logger.error(err);` if needed – which is useful if you have jobs that need to store logs to a database using post hooks before the job shuts down with `process.exit(0)`.  Note that the resolved Promise returns an Array of the returned values from post hooks, executed serially via `p-map-series`.  If no post hooks exist, then logger invocations will return an Object consisting of `{ method, err, message, meta }`, whereas `method` is the logger method invoked with (e.g. `logger.error()` will have a `method: 'error'` value).

You should properly handle any errors in your pre hooks, otherwise they will be thrown and logger methods will not be invoked.

We will catch errors for post hooks by default and log them as errors with your logger methods' `logger.error` method).

Hooks can be defined in the options passed to an instance of Axe, e.g. `new Axe({ hooks: { pre: [ fn ], post: [ fn ] } });` and/or with the method `logger.pre(level, fn)` or `logger.post(level, fn)`. Here are a few examples below:

```js
const Axe = require('axe');

const logger = new Axe({
  hooks: {
    pre: [
      function (level, err, message, meta) {
        message = message.replace(/world/gi, 'planet earth');
        return [err, message, meta];
      }
    ]
  }
});

logger.info('hello world');

// hello planet earth
```

```js
const Axe = require('axe');

const logger = new Axe();

logger.pre('error', (err, message, meta) => {
  if (err instanceof Error) err.is_beep_boop = true;
  return [err, message, meta];
});

logger.error(new Error('oops'));

// Error: oops
//     at Object.<anonymous> (/Users/user/Projects/axe/test.js:39:14)
//     at Module._compile (node:internal/modules/cjs/loader:1105:14)
//     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1159:10)
//     at Module.load (node:internal/modules/cjs/loader:981:32)
//     at Function.Module._load (node:internal/modules/cjs/loader:822:12)
//     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:77:12)
//     at node:internal/main/run_main_module:17:47 {
//   is_beep_boop: true
// }
```

```js
const fs = require('node:fs');
const path = require('node:path');

const Axe = require('axe');

const logger = new Axe();

logger.post('error', async (err, message, meta) {
  // store the log
  await fs.promises.appendFile(
    path.join(__dirname, 'logs.txt'),
    JSON.stringify({ err, message, meta }, null, 2) + '\n'
  );
  return { method: 'error', err, message, meta };
});

// wait until logger stores the log
const [ log ] = await logger.error(new Error('oops'));
console.log(log);

// will wait to store logs before exiting process
process.exit(0);
```

For more examples of hooks, see our below sections on [Send Logs to HTTP Endpoint](#send-logs-to-http-endpoint), [Send Logs to Slack](#send-logs-to-slack)), and [Suppress Logger Data](#suppress-logger-data) below.

### Symbols

If you use Symbols (e.g. `new Symbol('hello')` or `Symbol.for('hello')`, and also wish to use these Symbols with remapping, picking, or omitting – then you must refer to them in dot-notation with either the `Symbol.keyFor(symbol)` value or the `symbol.description` value.  In the case of `const symbol = new Symbol('hello')` and `const symbol = Symbol.for('hello')`, the dot-notation format would be simply be the key value `"hello"` – however if the symbol is nested in an object such as `obj[symbol]`, then the dot-notation value would be `obj.hello`.

### Remapping

If you would like to remap fields, such as `response.headers` to `responseHeaders`, then you can use environment variables or pass an object with configuration mapping.

```js
const logger = new Axe({
  meta: {
    remappedFields: {
      'response.headers': 'responseHeaders'
    }
  }
});

logger.info('foo bar', {
  response: {
    headers: {
      'X-Hello-World': true
    }
  }
});

// foo bar { responseHeaders: { 'X-Hello-World': true } }
```

### Omitting

If you would like to omit fields, such as `response.headers` from a response, so you are only left with the status code:

```js
const logger = new Axe({
  meta: {
    omittedFields: ['response.headers']
  }
});

logger.info('foo bar', {
  response: {
    status: 200,
    headers: {
      'X-Hello-World': true
    }
  }
});

// foo bar { response: { status: 200 } }
```

### Picking

If you would like to pick certain fields, such as `response.status` from a response:

```js
const logger = new Axe({
  meta: {
    pickedFields: [ 'response.status' ]
  }
});

logger.info('foo bar', {
  response: {
    status: 200,
    headers: {
      'X-Hello-World': true
    }
  }
});

// foo bar { response: { status: 200 } }
```

### Aliases

We have provided helper/safety aliases for `logger.warn` and `logger.error` of `logger.warning` and `logger.err` respectively.

### Methods

A few extra methods are available, which were inspired by [Slack's logger][slack-logger] and added for compatibility:

* `logger.setLevel(level)` - sets the log `level` (String) severity to invoke `logger` methods for (must be valid enumerable level)
* `logger.getNormalizedLevel(level)` - gets the normalized log `level` (String) severity (normalizes to known logger levels, e.g. "warning" => "warn", "err" => "error", "log" => "info")
* `logger.setName(name)` - sets the `name` (String) property (some loggers like `pino` will prefix logs with the name set here)


## Examples

### Send Logs to HTTP Endpoint

This is an example of using hooks to send a POST request to an HTTP endpoint with logs of the "fatal" and "error" levels that occur in your application:

We recommend [superagent](https://github.com/visionmedia/superagent), however there are plenty of alternatives such as [axios](https://github.com/axios/axios) and [ky](https://github.com/sindresorhus/ky).

1. You will also need to install additional packages:

   ```sh
   npm install axe cuid parse-err fast-safe-stringify superagent
   ```

2. Implementation example is provided below (and you can also refer to the [Forward Email][forward-email-code] code base):

   ```js
   const Axe = require('axe');
   const cuid = require('cuid');
   const parseErr = require('parse-err');
   const safeStringify = require('fast-safe-stringify');
   const superagent = require('superagent');

   const logger = new Axe();

   // <https://github.com/cabinjs/axe/#send-logs-to-http-endpoint>
   async function hook(err, message, meta) {
     //
     // return early if we wish to ignore this
     // (this prevents recursion; see end of this fn)
     //
     if (meta.ignore_hook) return;

     try {
       const request = superagent
         .post(`https://api.example.com/v1/log`)
         // if the meta object already contained a request ID then re-use it
         // otherwise generate one that gets re-used in the API log request
         // (which normalizes server/browser request id formatting)
         .set(
           'X-Request-Id',
           meta && meta.request && meta.request.id ? meta.request.id : cuid()
         )
         .set('X-Axe-Version', logger.config.version)
         .timeout(5000);

       // if your endpoint is protected by an API token
       // note that superagent exposes `.auth()` method
       // request.auth(API_TOKEN);

       const response = await request
         .type('application/json')
         .retry(3)
         .send(safeStringify({ err: parseErr(err), message, meta }));

       logger.info('log sent over HTTP', { response, ignore_hook: true });
     } catch (err) {
       logger.fatal(err, { ignore_hook: true });
     }
   }

   for (const level of logger.config.levels) {
     logger.post(level, hook);
   }
   ```

### Send Logs to Slack

This is an example of using hooks to send a message to Slack with logs of the "fatal" and "error" levels that occur in your application:

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

   // create our application logger that uses hooks
   const logger = new Axe({
     logger: console, // optional (e.g. pino, signale, consola)
     level: 'info' // optional (defaults to info)
   });

   // create an instance of the Slack Web Client API for posting messages
   const web = new WebClient('INSERT-YOUR-TOKEN', {
     // https://slack.dev/node-slack-sdk/web-api#logging
     logger,
     logLevel: logger.config.level
   });

   async function hook(err, message, meta) {
     //
     // return early if we wish to ignore this
     // (this prevents recursion; see end of this fn)
     //
     if (meta.ignore_hook) return;

     // otherwise post a message to the slack channel
     try {
       const result = await web.chat.postMessage({
         channel: 'monitoring',
         username: 'Axe',
         icon_emoji: ':axe:',
         attachments: [
           {
             title: err && err.message || message,
             color: 'danger',
             text: err && err.stack || message,
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
       logger.info('slack message sent', { result });
     } catch (err) {
       logger.fatal(err, { ignore_hook: true });
     }
   }

   // bind custom hooks for "fatal" and "error" log levels
   logger.post('error', hook);
   logger.post('fatal', hook);

   // test out the slack integration
   logger.error(new Error('Uh oh something went wrong!'));
   ```

### Send Logs to Sentry

See below example and the reference at <https://docs.sentry.io/platforms/node/> for more information.

```sh
npm install @sentry/node
```

```js
const Axe = require('axe');
const Sentry = require('@sentry/node');

const logger = new Axe();

Sentry.init({
  // TODO: input your DSN here from Sentry once you're logged in at:
  // https://docs.sentry.io/platforms/node/#configure
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
});

for (const level of logger.config.levels) {
  logger.post(level, (err, message, meta) => {
    // https://docs.sentry.io/clients/node/usage/
    if (err) {
      Sentry.captureException(err, meta);
    } else {
      Sentry.captureMessage(message, meta);
    }
  });
}

// do stuff
logger.error(new Error('uh oh'));
```

### Send Logs to Datadog

See below example and the reference at <https://docs.datadoghq.com/logs/log_collection/nodejs/?tab=winston30#agentless-logging>.

Be sure to replace `DATADOG_API_KEY` and `DATADOG_APP_NAME` with your Datadog API key and application name.

```sh
npm install axe cuid parse-err fast-safe-stringify superagent
```

```js
const Axe = require('axe');
const cuid = require('cuid');
const parseErr = require('parse-err');
const safeStringify = require('fast-safe-stringify');
const superagent = require('superagent');

const logger = new Axe();

// TODO: use env var or replace this const with a string
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

// TODO: use env var or replace this const with a string
const DATADOG_APP_NAME = process.env.DATADOG_APP_NAME;

// <https://github.com/cabinjs/axe/#send-logs-to-datadog>
async function hook(err, message, meta) {
  //
  // return early if we wish to ignore this
  // (this prevents recursion; see end of this fn)
  //
  if (meta.ignore_hook) return;

  try {
    const request = superagent
      .post(`https://http-intake.logs.datadoghq.com/api/v2/logs?dd-api-key=${DATADOG_API_KEY}&ddsource=nodejs&service=${DATADOG_APP_NAME}`)
      // if the meta object already contained a request ID then re-use it
      // otherwise generate one that gets re-used in the API log request
      // (which normalizes server/browser request id formatting)
      .set(
        'X-Request-Id',
        meta && meta.request && meta.request.id ? meta.request.id : cuid()
      )
      .set('X-Axe-Version', logger.config.version)
      .timeout(5000);

    const response = await request
      .type('application/json')
      .retry(3)
      .send(safeStringify({ err: parseErr(err), message, meta }));

    logger.info('log sent over HTTP', { response, ignore_hook: true });
  } catch (err) {
    logger.fatal(err, { ignore_hook: true });
  }
}

for (const level of logger.config.levels) {
  logger.post(level, hook);
}
```

### Send Logs to Papertrail

See below example and the reference at <https://www.papertrail.com/help/configuring-centralized-logging-from-nodejs-apps/>.

Be sure to replace `PAPERTRAIL_TOKEN` with your Papertrail token.

```sh
npm install axe cuid parse-err fast-safe-stringify superagent
```

```js
const Axe = require('axe');
const cuid = require('cuid');
const parseErr = require('parse-err');
const safeStringify = require('fast-safe-stringify');
const superagent = require('superagent');

const logger = new Axe();

// TODO: use env var or replace this const with a string
const PAPERTRAIL_TOKEN = process.env.PAPERTRAIL_TOKEN;

// <https://github.com/cabinjs/axe/#send-logs-to-papertrail>
async function hook(err, message, meta) {
  //
  // return early if we wish to ignore this
  // (this prevents recursion; see end of this fn)
  //
  if (meta.ignore_hook) return;

  try {
    const request = superagent
      .post('https://logs.collector.solarwinds.com/v1/log')
      // if the meta object already contained a request ID then re-use it
      // otherwise generate one that gets re-used in the API log request
      // (which normalizes server/browser request id formatting)
      .set(
        'X-Request-Id',
        meta && meta.request && meta.request.id ? meta.request.id : cuid()
      )
      .set('X-Axe-Version', logger.config.version)
      .timeout(5000);

    request.auth('', PAPERTRAIL_TOKEN);

    const response = await request
      .type('application/json')
      .retry(3)
      .send(safeStringify({ err: parseErr(err), message, meta }));

    logger.info('log sent over HTTP', { response, ignore_hook: true });
  } catch (err) {
    logger.fatal(err, { ignore_hook: true });
  }
}

for (const level of logger.config.levels) {
  logger.post(level, hook);
}
```

### Suppress Logger Data

This is an example of using a custom hook to manipulate logger arguments to suppress sensitive data.

```js
const Axe = require('.');

const logger = new Axe();

for (const level of logger.config.levels) {
  const fn = logger.config.logger[level];
  logger.config.logger[level] = function (message, meta) {
    // replace any messages "beep" -> "boop"
    if (typeof message === 'string') message = message.replace(/beep/g, 'boop');

    // mask the property "beep" in the meta object "data"
    if (meta?.data?.beep)
      meta.data.beep = Array.from({ length: meta.data.beep.length })
        .fill('*')
        .join('');

    return Reflect.apply(fn, this, [message, meta]);
  };
}

logger.warn('hello world beep');

// hello world boop

logger.info('start', {
  data: {
    foo: 'bar',
    beep: 'boop' // <--- we're suppressing "beep" -> "****"
  }
});

// start { data: { foo: 'bar', beep: '****' } }

logger.error(new Error('oops!'), {
  data: {
    beep: 'beep-boop-beep' // this becomes "**************"
  }
});

// Error: oops!
//     at Object.<anonymous> (/Users/user/Projects/axe/test.js:30:14)
//     at Module._compile (node:internal/modules/cjs/loader:1105:14)
//     at Object.Module._extensions..js (node:internal/modules/cjs/loader:1159:10)
//     at Module.load (node:internal/modules/cjs/loader:981:32)
//     at Function.Module._load (node:internal/modules/cjs/loader:822:12)
//     at Function.executeUserEntryPoint [as runMain] (node:internal/modules/run_main:77:12)
//     at node:internal/main/run_main_module:17:47 { data: { beep: '**************' } }
```


## Contributors

| Name               | Website                           |
| ------------------ | --------------------------------- |
| **Nick Baugh**     | <http://niftylettuce.com>         |
| **Alexis Tyler**   | <https://wvvw.me/>                |
| **shadowgate15**   | <https://github.com/shadowgate15> |
| **Spencer Snyder** | <https://spencersnyder.io>        |


## License

[MIT](LICENSE) © [Nick Baugh](http://niftylettuce.com)


##

[npm]: https://www.npmjs.com/

[lad]: https://lad.js.org/

[cabin]: https://cabinjs.com/

[browserify]: https://github.com/browserify/browserify

[webpack]: https://github.com/webpack/webpack

[rollup]: https://github.com/rollup/rollup

[signale]: https://github.com/klauscfhq/signale

[pino]: https://github.com/pinojs/pino

[winston]: https://github.com/winstonjs/winston

[bunyan]: https://github.com/trentm/node-bunyan

[console-polyfill]: https://github.com/paulmillr/console-polyfill

[consola]: https://github.com/nuxt/consola

[log4j]: https://en.wikipedia.org/wiki/Log4j#Log4j_log_levels

[parse-app-info]: https://github.com/cabinjs/parse-app-info

[slack-logger]: https://github.com/slackapi/node-slack-sdk/tree/master/packages/logger

[format-util]: https://github.com/tmpfs/format-util

[util.format]: https://nodejs.org/api/util.html#util_util_format_format_args

[format-specifiers]: https://github.com/cabinjs/format-specifiers

[forward-email]: https://forwardemail.net

[forward-email-code]: https://github.com/forwardemail/forwardemail.net

[high-console]: https://github.com/tusharf5/high-console

[maybe-combine-errors]: https://github.com/vweevers/maybe-combine-errors

[parse-err]: https://github.com/cabinjs/parse-err

[parse-request]: https://github.com/cabinjs/parse-request
