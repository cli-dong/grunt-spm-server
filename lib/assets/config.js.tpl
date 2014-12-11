(function(window, seajs, undefined) {

  'use strict';

  if (!seajs) {
    return;
  }

  function addParam(url, param) {
    if (!param) {
      return url;
    }

    return url + (url.indexOf('?') === -1 ? '?' : '&') + param;
  }

  // debug 开关
  var debug = window.location.search.indexOf('debug') > 0;

  // 映射表
  var map = [];

  if (debug) {
    // debug 模式
    //@PLUGINS
  } else {
    // 部署模式
    map.push(function(url) {
      // 仅重定向 app 目录
      return addParam(url.replace('/app/', '/dist/@APPNAME/app/'), '@VERSION');
    });
  }

  seajs.config({
    base: './',
    alias: {
      //@ALIAS
    },
    map: map,
    debug: debug
  });

})(this, this.seajs);
