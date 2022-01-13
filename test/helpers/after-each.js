module.exports = function (t) {
  for (const level of ['log', 'trace', 'debug', 'info', 'warn', 'error'].filter(
    (level) => t.context[level]
  )) {
    t.context[level].restore();
  }
};
