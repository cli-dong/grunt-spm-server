'use strict';

var chalk = require('chalk');
var favicon = require('serve-favicon');
var finalhandler = require('finalhandler');
var fs = require('fs');
var http = require('http');
var mime = require('mime');
var path = require('path');
var serveIndex = require('serve-index');
var dep = require('spm-deps');
var transport = require('./transport');

function logError(err) {
  console.error(err.stack || err.toString());
}

var tree, _favicon, _serveIndex;

module.exports = function server(options) {

  chalk.enabled = true;

  _serveIndex = serveIndex(options.base, {
    'icons': true
  });

  _favicon = favicon(__dirname + '/assets/favicon.png');

  function getFullPath(url) {
    return path.join(process.cwd(), options.base, url);
  }

  function getRealPath(url) {
    return url.replace(/\.(css|handlebars|json)\.js$/, '.$1');
  }

  function getMimeType(url) {
    return mime.lookup(url.replace(/\?+.+$/, ''));
  }

  function getModName(url) {
    var m = url.match(/\/spm_modules\/([\w\-\.]+)/i);

    if (!m) {
      m = url.match(/\/([\w\-\.]+)\.[0-9a-z]+$/i);
    }

    return m[1];
  }

  function replaceDependencies(buf, url) {
    if (!tree) {
      tree = dep({
        idleading: options.idleading
      });
    }

    var mod = getModName(url);
    var deps = tree.get(mod);

    if (!deps) {
      deps = tree.get();
    }

    /*jshint maxparams:4 */
    buf = buf.replace(/(require\(['"])([\w\-\.]+)(['"]\))/g, function($0, $1, $2, $3) {
      if (deps.hasOwnProperty($2)) {
        $2 = deps[$2];
      }
      return $1 + $2 + $3;
    });

    return buf;
  }

  function transBuffer(buf, url) {
    var ext = url.substring(url.lastIndexOf('.'));

    if (buf instanceof Buffer) {
      buf = buf.toString();
    }

    switch (ext) {
      case '.handlebars':
        buf = transport.handlebars(buf);
        break;
      case '.css':
        buf = transport.css(buf);
        break;
      case '.js':
        buf = transport.js(buf);
        break;
      case '.json':
        buf = transport.json(buf);
        break;
      default:
        break;
    }

    return replaceDependencies(buf, url);
  }

  function serve(req, res, done) {
    req.url = getRealPath(req.url);

    fs.readFile(getFullPath(req.url), function (err, buf) {
      if (err) {
        return done(err);
      }

      // check if need wrapping
      if (options.rule(req.url, req.query, options.idleading)) {
        console.log(chalk.white('    ' + chalk.green('[WRAPPED]') + ' %s'), req.url);
        buf = transBuffer(buf, req.url);
      } else {
        console.log(chalk.gray('    [SKIPPED] %s'), req.url);
      }

      res.setHeader('Content-Type', getMimeType(req.url) + '; charset=utf-8');
      res.end(buf);
    });
  }

  // Create server
  var server = http.createServer(function onRequest(req, res){
    var done = finalhandler(req, res, {
      onerror: logError
    });

    // serve favicon
    _favicon(req, res, function(err) {
      if (err) {
        return done(err);
      }

      // remove query
      req.url = req.url.replace(/\?+(.+)$/, '');
      req.query = RegExp.$1;

      // serve directory
      _serveIndex(req, res, function() {
        // serve files
        serve(req, res, done);
      });
    });
  });

  // Listen
  server.listen(options.port);

  console.log(chalk.magenta('■■Listening dest: "%s" at port: "%s" ...'), options.base, options.port);

};
