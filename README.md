# Axe

[![build status](https://img.shields.io/travis/cabinjs/axe.svg)](https://travis-ci.org/cabinjs/axe)
[![code coverage](https://img.shields.io/codecov/c/github/cabinjs/axe.svg)](https://codecov.io/gh/cabinjs/axe)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://github.com/lassjs/lass)
[![license](https://img.shields.io/github/license/cabinjs/axe.svg)](<>)

> Logging utility for Node and Browser environments. Chop up your logs!
>
> Built on top of [Signale][] and [high-console][]. Made for [Cabin][] and [Lad][].


## Table of Contents

* [Install](#install)
  * [Node](#node)
  * [Browser](#browser)
* [Usage](#usage)
  * [Basic](#basic)
  * [Hide timestamps from console output](#hide-timestamps-from-console-output)
  * [Suppress logs](#suppress-logs)
  * [Specify process name](#specify-process-name)
* [Options](#options)
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
  <!-- See "Usage" section in Axe docs -->
  (function() {
    var Axe = new Axe();
    axe.info('hello world');
  });
</script>
```

#### Bundler

If you're using something like [browserify][], [webpack][], or [rollup][], then install the package as you would with [Node](#node) above.


## Usage

### Basic

```js
const Axe = require('axe');

const axe = new Axe();

axe.info('hello world');
// info: hello world
```

### Hide timestamps from console output

```js
const Axe = require('axe');

const axe = new Axe({ timestamp: false });
```

### Suppress logs

This is useful when you want need logging turned on in certain circumstances.
For example when you're running tests you can set `axe.config.silent = true`.

```js
const Axe = require('axe');

const axe = new Axe({ silent: true });

axe.info('hello world');
```

### Specify process name

In case you need to run multiple node processes together we recommend passing a `processName` to the logger.

Note that for `axe.debug`, we will default to `appName` if `processName` is not set.

```js
const Axe = require('axe');

const axe = new Axe({ processName: 'web' });

axe.info('hello world');
// [web] info: hello world
```


## Options

* `timestamp` (String) - defaults to `toLocaleString` (which outputs a [locale string][locale]), you can also specify `toISO` if you wish to output a [ISO 8601 string][iso-8601].  If you specify `false` (Boolean) then no timestamp will be prepended (this uses [luxon][] under the hood).
* `locale` (String) - defaults to `en` (but you could specify something like `fr` to get French or `es` to get Spanish localization output for timestamps)
* `showStack` (Boolean) - defaults to `true`, whether or not to output a stack trace
* `silent` (Boolean) - defaults to `false`, whether or not to suppress log output to console
* `appName` (String) - defaults to `"axe"`, used for `axe.debug` output primarily
* `processName` (String) - defaults to `null`, whether or not to prepend logs with the String `[appName] ...`
* `processColor` (String) - defaults to `bgCyan`, the background color to use behind the String `[appName]` (this is only applicable for server environments)
* `logger` (Object) - defaults to an empty Object `{}`, but you can pass custom options for the browser ([high-console][]) or the server ([signale][]) here


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

[iso-8601]: https://moment.github.io/luxon/docs/manual/formatting.html#iso-8601

[locale]: https://moment.github.io/luxon/docs/manual/formatting.html#tolocalestring--strings-for-humans-

[luxon]: https://github.com/moment/luxon
