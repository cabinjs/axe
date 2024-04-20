const test = require('ava');
const Axe = require('../lib');

const loggerFnsCheck = test.macro({
  exec(t, field) {
    t.throws(
      () =>
        new Axe({
          logger: {
            [field]: field
          }
        })
    );
  },
  title(_providedTitle = '', field) {
    return `throws if logger fn "${field}" is not a function but is defined`;
  }
});

for (const field of ['error', 'info', 'log']) {
  test(loggerFnsCheck, field);
}
