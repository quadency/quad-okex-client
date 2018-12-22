'use strict';

var _okexApiWs = require('./okex-api-ws');

var _okexApiWs2 = _interopRequireDefault(_okexApiWs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function test() {
  const c = new _okexApiWs2.default();
  c.subscribeDepths(['BTC-USDT'], orderMessage => {
    console.log('order', JSON.stringify(orderMessage));
  });
}

test();