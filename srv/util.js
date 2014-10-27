var when = require('when');
var util = require('util');

var Util = {
  HTTPError: function (code, response, message, fileName, lineNumber) {
    this.httpCode = code;
    this.httpResponse = response;
    Error.call(this, message, fileName, lineNumber);
  },
  sendResponse: function (res, fn) {
    if (typeof(fn) !== 'function') {
      var obj = fn;
      fn = function () { return obj; };
    }
    when.try(fn).then(function (response) {
      response = response || {};
      if (typeof(response) !== 'string') {
        response = JSON.stringify(response);
      }
      res.end(response);
    }, function (err) {
      var code = err.httpCode || 500;
      var response = err.httpResponse || err.message;
      if (typeof(response) !== 'string') {
        response = JSON.stringify(response);
      }
      res.status(code).end(response);
    });
  }
};

util.inherits(Util.HTTPError, Error);

module.exports = Util;

