const sinon = require('sinon');

const Logger = require('../../');

function beforeEach(t) {
  const logger = new Logger({ processName: 'ava-tests' });
  Object.assign(t.context, {
    logger,
    spy: sinon.spy(console, 'log'),
    stderr: sinon.spy(process.stderr, 'write')
  });
}

function afterEach() {
  console.log.restore();
  process.stderr.write.restore();
}

module.exports = { beforeEach, afterEach };
