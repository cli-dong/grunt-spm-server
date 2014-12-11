'use strict';

var handlebars = require('handlebars');

module.exports = function(content) {
  return [
    'define(function(require, exports, module) {\n',
      'var handlebars = require(\'handlebars-runtime\')[\'default\'];\n',
      'module.exports = handlebars.template(',
        handlebars.precompile(content),
      ');',
    '\n});'
    ].join('');
};
