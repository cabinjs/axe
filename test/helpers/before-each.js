const sinon = require('sinon');

const Axe = require('../../lib');

module.exports = function (logger) {
  return function (t) {
    const axe = new Axe({ capture: false, logger, level: 'trace' });
    t.context.axe = axe;
    for (const level of [
      'log',
      'trace',
      'debug',
      'info',
      'warn',
      'error'
    ].filter((level) => axe.config.logger[level])) {
      t.context[level] = sinon.spy(axe.config.logger, level);
    }
  };
};
