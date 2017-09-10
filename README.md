# [**@ladjs/logger**](https://github.com/ladjs/logger)

[![build status](https://img.shields.io/travis/ladjs/logger.svg)](https://travis-ci.org/ladjs/logger)
[![code coverage](https://img.shields.io/codecov/c/github/ladjs/logger.svg)](https://codecov.io/gh/ladjs/logger)
[![code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)
[![styled with prettier](https://img.shields.io/badge/styled_with-prettier-ff69b4.svg)](https://github.com/prettier/prettier)
[![made with lass](https://img.shields.io/badge/made_with-lass-95CC28.svg)](https://github.com/lassjs/lass)
[![license](https://img.shields.io/github/license/ladjs/logger.svg)](<>)

> Logger for Lad


## Table of Contents

* [Install](#install)
* [Usage](#usage)
* [Contributors](#contributors)
* [Trademark Notice](#trademark-notice)
* [License](#license)


## Install

[npm][]:

```sh
npm install @ladjs/logger
```

[yarn][]:

```sh
yarn add @ladjs/logger
```


## Usage

```js
const Logger = require('@ladjs/logger');

const logger = new Logger();

console.log(logger.info('hello world'));
// info: hello world
```

# Suppress logs

This is useful when you want need logging turned on in certain circumstances.
For example when you're running tests you can set `logger.config.silent = true`.
```js
const Logger = require('@ladjs/logger');

const logger = new Logger({ silent: true });

console.log(logger.info('hello world'));
```


## Contributors

| Name             | Website            |
| ---------------- | ------------------ |
| **Alexis Tyler** | <https://wvvw.me/> |


## Trademark Notice

Lad, Lass, and their respective logos are trademarks of Niftylettuce LLC.
These trademarks may not be reproduced, distributed, transmitted, or otherwise used, except with the prior written permission of Niftylettuce LLC.
If you are seeking permission to use these trademarks, then please [contact us](mailto:niftylettuce@gmail.com).


## License

[MIT](LICENSE) © [Alexis Tyler](https://wvvw.me/)


##

[npm]: https://www.npmjs.com/

[yarn]: https://yarnpkg.com/
