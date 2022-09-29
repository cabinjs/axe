module.exports = {
  prettier: true,
  space: true,
  extends: ['xo-lass'],
  env: ['node', 'browser'],
  ignore: ['config.js'],
  rules: {
    'n/prefer-global/process': 'off',
    'prefer-object-spread': 'off',
    'unicorn/prefer-includes': 'off'
  }
};
