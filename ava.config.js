module.exports = {
  serial: true,
  failFast: true,
  files: [
    'test/*.js',
    'test/**/*.js',
    '!test/helpers/*.js',
    '!test/helpers/**/*.js'
  ],
  timeout: '30s'
};
