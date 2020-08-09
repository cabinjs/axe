const path = require('path');
const { readFileSync } = require('fs');
const { Script } = require('vm');
const test = require('ava');
const _ = require('lodash');
const { JSDOM, VirtualConsole } = require('jsdom');

const virtualConsole = new VirtualConsole();
virtualConsole.sendTo(console);

const script = new Script(
  readFileSync(path.join(__dirname, '..', 'dist', 'axe.min.js'))
);

const dom = new JSDOM(``, {
  url: 'http://localhost:3000/',
  referrer: 'http://localhost:3000/',
  contentType: 'text/html',
  includeNodeLocations: true,
  resources: 'usable',
  runScripts: 'dangerously',
  virtualConsole
});

dom.runVMScript(script);

test('should create a new Axe instance', (t) => {
  const axe = new dom.window.Axe();
  t.true(_.isObject(axe));
  axe.info('hello');
});

test('capture should be false in browser', (t) => {
  const axe = new dom.window.Axe();
  t.false(axe.config.capture);
});
