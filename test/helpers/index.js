const sinon = require('sinon');

const Axe = require('../../lib');

function beforeEach(t) {
  const axe = new Axe({ processName: 'ava-tests' });
  Object.assign(t.context, {
    axe,
    spy: sinon.spy(console, 'log'),
    stderr: sinon.spy(process.stderr, 'write')
  });
}

function afterEach() {
  console.log.restore();
  process.stderr.write.restore();
}

module.exports = { beforeEach, afterEach };
