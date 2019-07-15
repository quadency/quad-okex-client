'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

let delay = (() => {
  var _ref = _asyncToGenerator(function* (duration) {
    if (duration < 0) {
      return null;
    }
    return new Promise(function (resolve) {
      setTimeout(_asyncToGenerator(function* () {
        resolve();
      }), duration);
    });
  });

  return function delay(_x) {
    return _ref.apply(this, arguments);
  };
})();

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const COMMON_CURRENCIES = {
  FAIR: 'FairGame',
  HOT: 'Hydro Protocol',
  HSR: 'HC',
  MAG: 'Maggie',
  YOYO: 'YOYOW',
  XBT: 'BTC',
  BCC: 'BCH',
  DRK: 'DASH',
  BCHABC: 'BCH',
  BCHSV: 'BSV'
};

const CHANNELS = {
  TICKER: 'spot/ticker', // ticker channel
  CANDLE_60: 'spot/candle60s', // 1mins kline channel
  CANDLE_180: 'spot/candle180s', // 3mins kline channel
  CANDLE_300: 'spot/candle300s', // 5mins kline channel
  CANDLE_900: 'spot/candle900s', // 15mins kline channel
  CANDLE_1800: 'spot/candle1800s', // 30mins kline channel
  CANDLE_3600: 'spot/candle3600s', // 1hour kline channel
  CANDLE_7200: 'spot/candle7200s', // 2hour kline channel
  CANDLE_14400: 'spot/candle14400s', // 4hour kline channel
  CANDLE_21600: 'spot/candle21600s', // 6hour kline channel
  CANDLE_43200: 'spot/candle43200s', // 12hour kline channel
  CANDLE_86400: 'spot/candle86400s', // 1day kline channel
  CANDLE_604800: 'spot/candle604800s', // 1week kline channel
  TRADE: 'spot/trade', // trade information
  DEPTH: 'spot/depth', // depth information,200 entries of depth data for the first time, then increment data
  DEPTH5: 'spot/depth5', // depth information, the previous five entries of depth data
  ACCOUNT: 'spot/account', // User's account information
  MARGIN_ACCOUNT: 'spot/margin_account', // User's margin account information
  ORDER: 'spot/order' // User's order information
};

exports.delay = delay;
exports.COMMON_CURRENCIES = COMMON_CURRENCIES;
exports.CHANNELS = CHANNELS;