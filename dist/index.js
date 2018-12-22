'use strict';

var _okexApi = require('./okex-api');

var _okexApi2 = _interopRequireDefault(_okexApi);

var _okexApiWs = require('./okex-api-ws');

var _okexApiWs2 = _interopRequireDefault(_okexApiWs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

module.exports = {
  RestClient: _okexApi2.default,
  WebsocketClient: _okexApiWs2.default
};