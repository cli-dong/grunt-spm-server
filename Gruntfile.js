/*
 * grunt-spm-server
 * https://github.com/crossjs/grunt-spm-server
 *
 * Copyright (c) 2014 crossjs
 * Licensed under the MIT license.
 */

module.exports = function(grunt) {

  'use strict';

  grunt.initConfig({

    server: {
      develop: {
        options: {
          base: 'tests',
          config: false
        }
      }
    }

  });

  grunt.loadTasks('tasks');

  grunt.registerTask('default', ['server:develop']);

};
