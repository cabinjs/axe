const test = require('ava');
const _ = require('lodash');
const jsdom = require('jsdom');
const jsdomOld = require('jsdom/lib/old-api');

test.before.cb(t => {
  jsdomOld.env({
    html: '',
    scripts: [require.resolve('../dist/axe.min.js')],
    virtualConsole: new jsdom.VirtualConsole().sendTo(console),
    done(err, window) {
      if (err) return t.end(err);
      t.context.window = window;
      t.end();
    }
  });
});

test('should create a new Axe instance', t => {
  const axe = new t.context.window.Axe({ capture: false });
  t.true(_.isObject(axe));
  axe.info('hello');
});
