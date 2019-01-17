const parseAppInfo = require('parse-app-info');

let appInfo = {};

parseAppInfo().then(app => {
  appInfo = app;
});

module.exports = appInfo;
