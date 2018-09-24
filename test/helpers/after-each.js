module.exports = function(t) {
  ['log', 'trace', 'debug', 'info', 'warn', 'error']
    .filter(level => t.context[level])
    .forEach(level => {
      t.context[level].restore();
    });
};
