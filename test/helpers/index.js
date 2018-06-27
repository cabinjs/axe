const sinon = require('sinon');

const Axe = require('../../lib');

function beforeEach(t) {
  const axe = new Axe({ capture: false });
  Object.assign(t.context, {
    axe,
    log: sinon.spy(console, 'log'),
    trace: sinon.spy(console, 'trace'),
    debug: sinon.spy(console, 'debug'),
    info: sinon.spy(console, 'info'),
    warn: sinon.spy(console, 'warn'),
    error: sinon.spy(console, 'error'),
    stderr: sinon.spy(process.stderr, 'write')
  });
}

function afterEach() {
  console.log.restore();
  console.trace.restore();
  console.debug.restore();
  console.info.restore();
  console.warn.restore();
  console.error.restore();
  process.stderr.write.restore();
}

module.exports = { beforeEach, afterEach };
