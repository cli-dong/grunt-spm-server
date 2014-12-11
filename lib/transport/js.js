'use strict';

module.exports = function(content) {
  return [
    'define(function(require, exports, module) {\n',
      content,
    '\n});'
    ].join('');
};
