module.exports = function (t) {
  for (const level of [
    'log',
    'trace',
    'debug',
    'info',
    'warn',
    'error',
    'fatal'
  ].filter((level) => t.context[level])) {
    t.context[level].restore();
  }
};
