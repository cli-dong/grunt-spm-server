'use strict';

module.exports = function(content) {
  return [
    'define(function(require, exports, module) {\n',
      'module.exports = \'',
        content.replace(/\'/g, '\\\''),
      '\';',
    '\n});'
    ].join('');
};
