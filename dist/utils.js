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

exports.delay = delay;
exports.COMMON_CURRENCIES = COMMON_CURRENCIES;