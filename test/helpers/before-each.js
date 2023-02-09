const sinon = require('sinon');

const Axe = require('../../lib');

module.exports = function (logger) {
  return function (t) {
    const axe = new Axe({
      logger,
      level: 'trace',
      meta: {
        remappedFields: {
          'remap.field': 'remappedField'
        },
        omittedFields: ['level', 'err', 'app', 'request', 'beep'],
        pickedFields: ['request.headers', 'foo.bar']
      },
      hooks: {
        pre: [
          function (level, err, message, meta) {
            if (message)
              message = message.replace(
                /prehookconfig/gi,
                `${level}prehookconfig`
              );
            return [err, message, meta];
          }
        ],
        post: [
          function (level, err, message, meta) {
            t.context[`${level}PostConfigTest`] = [err, message, meta];
            return { level, err, message, meta };
          }
        ]
      }
    });
    t.context.axe = axe;
    for (const level of [
      'log',
      'trace',
      'debug',
      'info',
      'warn',
      'error',
      'fatal'
    ].filter((level) => t.context.axe.config.logger[level])) {
      t.context.axe.pre(level, function (err, message, meta) {
        if (message)
          message = message.replace(/prehookadded/gi, `${level}prehookadded`);
        return [err, message, meta];
      });
      t.context.axe.post(level, function (err, message, meta) {
        t.context[`${level}PostTest`] = [err, message, meta];
      });
      t.context[level] = sinon.spy(t.context.axe.config.logger, level);
    }
  };
};
