'use strict';

module.exports = function(content) {
  return [
    'define(\n',
      content,
    '\n);'
    ].join('');
};
