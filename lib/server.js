'use strict';

var fs = require('fs');
var http = require('http');
var path = require('path');

var chalk = require('chalk');
var extend = require('extend');
var favicon = require('serve-favicon');
var finalhandler = require('finalhandler');
var mime = require('mime');
var open = require('open');
var serveIndex = require('serve-index');
var dep = require('spm-deps');

var transport = require('./transport');

function logError(err) {
  console.error(err.stack || err.toString());
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

function getAPIs(dest) {
  dest = path.join(process.cwd(), dest);

  var data = {};

  fs.readdirSync(dest).forEach(function(file) {
    if (/\.js(on)?$/.test(file)) {
     extend(data, require(path.join(dest, file)));
    }
  });

  return data;
}

var tree, mock;

module.exports = function server(options) {

  chalk.enabled = true;

  var _serveIndex = serveIndex(options.base, {
    'icons': true
  });

  var _serveIcon = favicon(__dirname + '/assets/favicon.png');

  function getFullPath(url) {
    return path.join(process.cwd(), options.base, url);
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

  function _serveAPIs(req, res, done) {
    if (!options.api) {
      return done();
    }

    var data;

    if (/^(POST|PATCH|DELETE|GET)$/.test(req.method)) {

      if (!mock) {
        mock = getAPIs(options.api);
      }

      data = mock[req.url];

      if (data) {
        data = data[req.method] || data['*'];
      }

      if (data) {

        if (typeof data === 'function') {
          data = data(req.url, req.query);
        }

        if (typeof data === 'string' &&
            /^\{[\w\W]*\}|\[[\w\W]*\]$/.test(data)) {
          data = JSON.parse(data);
        }

        // redirect
        //
        //   'MOCKAPI': {
        //     'status': '302',
        //     'location': 'some.url'
        //   }
        if (data.MOCKAPI && data.MOCKAPI.status === '302') {
          req.url = data.MOCKAPI.location;
          return done();
        }

        console.log(chalk.white(chalk.blue('  [API 200]') + ' %s'), req.url);

        // json
        if (typeof data === 'object') {
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
        } else {
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
        }

        res.write(typeof data === 'object' ?  JSON.stringify(data) : data);
        res.end();
      } else {
        // only xhr
        if (req.headers['x-requested-with'] === 'XMLHttpRequest') {
          console.log(chalk.white(chalk.red('  [API 404]') + ' %s'), req.url);
        }

        done();
      }
    } else {
      done();
    }
  }

  function _serveFiles(req, res, done) {
    var oUrl = req.url;

    req.url = getRealPath(req.url);

    fs.readFile(getFullPath(req.url), function (err, buf) {
      if (err) {
        return done(err);
      }

      var mime;

      // check if need wrapping
      if (options.rule(req.url, req.query, options.idleading)) {
        console.log(chalk.white(chalk.green('  [WRAPPED]') + ' %s'), req.url);
        mime = getMimeType(oUrl);
        buf = transBuffer(buf, req.url);
      } else {
        console.log(chalk.gray('  [SKIPPED] %s'), req.url);
        mime = getMimeType(req.url);
      }

      res.setHeader('Content-Type', mime + '; charset=utf-8');
      res.end(buf);
    });
  }

  // Create server
  var server = http.createServer(function onRequest(req, res){
    var done = finalhandler(req, res, {
      onerror: logError
    });

    // TODO: 修改成 middleware 模式

    // serve favicon
    _serveIcon(req, res, function(err) {
      if (err) {
        return done(err);
      }

      // remove query
      req.url = req.url.replace(/\?+(.+)$/, '');
      req.query = RegExp.$1;

      // serve apis
      _serveAPIs(req, res, function(err) {
        if (err) {
          return done(err);
        }

        // serve directory
        _serveIndex(req, res, function(err) {
          if (err) {
            return done(err);
          }

          // serve files
          _serveFiles(req, res, done);
        });
      });
    });
  });

  // Listen
  server.listen(options.port);

  open('http://127.0.0.1:' + options.port);

  console.log(chalk.magenta('\n░▒▓██ Listening dest: "%s" at port: "%s" ... ██▓▒░\n'), options.base, options.port);
};
