const sinon = require('sinon');

const Axe = require('../../lib');

module.exports = function(logger) {
  return function(t) {
    const axe = new Axe({ capture: false, showMeta: false, logger });
    t.context.axe = axe;
    ['log', 'trace', 'debug', 'info', 'warn', 'error']
      .filter(level => axe.config.logger[level])
      .forEach(level => {
        t.context[level] = sinon.spy(axe.config.logger, level);
      });
  };
};
