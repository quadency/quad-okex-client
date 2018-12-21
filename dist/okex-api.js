'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _axios = require('axios');

var _axios2 = _interopRequireDefault(_axios);

var _cryptoJs = require('crypto-js');

var _cryptoJs2 = _interopRequireDefault(_cryptoJs);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

const EXCHANGE = 'OKEX';
const BASE_URL = 'https://www.okex.com';

const WALLET = '/api/account/v3/wallet';
const SPOT_ACCOUNT = '/api/spot/v3/accounts';
const CURRENCIES = '/api/account/v3/currencies';
const INSTRUMENTS = '/api/spot/v3/instruments';
const ORDERS = '/api/spot/v3/orders';
const CANCEL_ORDERS = '/api/spot/v3/cancel_orders';
const TRANSACTION_DETAILS = '/api/spot/v3/fills';

class OkexClient {
  constructor(userConfig = {}) {
    Object.keys(userConfig).forEach(key => {
      this[key] = userConfig[key];
    });
    this.proxy = '';
    this.RATE_LIMIT = 100;
  }

  static updateCurrencies(balances) {
    return balances.map(balance => {
      if (_utils.COMMON_CURRENCIES[balance.currency]) {
        return Object.assign(balance, { currency: _utils.COMMON_CURRENCIES[balance.currency] });
      }
      return balance;
    });
  }

  fetchWallet() {
    var _this = this;

    return _asyncToGenerator(function* () {
      const timestamp = (Date.now() / 1000).toString();
      const method = 'GET';
      const sign = _cryptoJs2.default.enc.Base64.stringify(_cryptoJs2.default.HmacSHA256(`${timestamp}${method}${WALLET}`, _this.secret));

      const options = {
        method,
        url: `${_this.proxy}${BASE_URL}${WALLET}`,
        headers: {
          'OK-ACCESS-KEY': _this.apiKey,
          'OK-ACCESS-SIGN': sign,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': _this.password,
          'Content-Type': 'application/json'
        }
      };

      try {
        const response = yield (0, _axios2.default)(options);
        if (response.status === 200) {
          return OkexClient.updateCurrencies(response.data);
        }
        console.error(`Status=${response.status} fetching wallet balances from ${EXCHANGE} because:`, response.data);
      } catch (err) {
        console.error(`Error fetching wallet balances from ${EXCHANGE} because:`, err);
      }
      return [];
    })();
  }

  fetchBalance() {
    var _this2 = this;

    return _asyncToGenerator(function* () {
      const timestamp = (Date.now() / 1000).toString();
      const method = 'GET';
      const sign = _cryptoJs2.default.enc.Base64.stringify(_cryptoJs2.default.HmacSHA256(`${timestamp}${method}${SPOT_ACCOUNT}`, _this2.secret));

      const options = {
        method,
        url: `${_this2.proxy}${BASE_URL}${SPOT_ACCOUNT}`,
        headers: {
          'OK-ACCESS-KEY': _this2.apiKey,
          'OK-ACCESS-SIGN': sign,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': _this2.password,
          'Content-Type': 'application/json'
        }
      };

      try {
        const response = yield (0, _axios2.default)(options);
        if (response.status === 200) {
          return OkexClient.updateCurrencies(response.data);
        }
        console.error(`Status=${response.status} fetching spot balances from ${EXCHANGE} because:`, response.data);
      } catch (err) {
        console.error(`Error fetching spot balances from ${EXCHANGE} because:`, err);
      }
      return [];
    })();
  }

  fetchCurrencies() {
    var _this3 = this;

    return _asyncToGenerator(function* () {
      const timestamp = (Date.now() / 1000).toString();
      const method = 'GET';
      const sign = _cryptoJs2.default.enc.Base64.stringify(_cryptoJs2.default.HmacSHA256(`${timestamp}${method}${CURRENCIES}`, _this3.secret));

      const options = {
        method,
        url: `${_this3.proxy}${BASE_URL}${CURRENCIES}`,
        headers: {
          'OK-ACCESS-KEY': _this3.apiKey,
          'OK-ACCESS-SIGN': sign,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': _this3.password,
          'Content-Type': 'application/json'
        }
      };

      try {
        const response = yield (0, _axios2.default)(options);
        if (response.status === 200) {
          return response.data;
        }
        console.error(`Status=${response.status} fetching currencies from ${EXCHANGE} because:`, response.data);
      } catch (err) {
        console.error(`Error fetching currencies from ${EXCHANGE} because:`, err);
      }
      return [];
    })();
  }

  fetchTrades(instrumentId) {
    var _this4 = this;

    return _asyncToGenerator(function* () {
      const options = {
        method: 'GET',
        url: `${_this4.proxy}${BASE_URL}${INSTRUMENTS}/${instrumentId}/trades`,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      try {
        const response = yield (0, _axios2.default)(options);
        if (response.status === 200) {
          return response.data;
        }
        console.error(`Status=${response.status} fetching transaction history from ${EXCHANGE} because:`, response.data);
      } catch (err) {
        console.error(`Error fetching transaction history from ${EXCHANGE} because:`, err);
      }
      return [];
    })();
  }

  fetchOrders(instrumentId, orderStatus = ['all']) {
    var _this5 = this;

    return _asyncToGenerator(function* () {
      const timestamp = (Date.now() / 1000).toString();
      const method = 'GET';
      const statuses = orderStatus.join('%7C');
      const path = `${ORDERS}?status=${statuses}&instrument_id=${instrumentId}`;
      const sign = _cryptoJs2.default.enc.Base64.stringify(_cryptoJs2.default.HmacSHA256(`${timestamp}${method}${path}`, _this5.secret));

      const options = {
        method,
        url: `${_this5.proxy}${BASE_URL}${path}`,
        headers: {
          'OK-ACCESS-KEY': _this5.apiKey,
          'OK-ACCESS-SIGN': sign,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': _this5.password,
          'Content-Type': 'application/json'
        }
      };

      try {
        const response = yield (0, _axios2.default)(options);
        if (response.status === 200) {
          return response.data;
        }
        console.error(`Status=${response.status} fetching users trades from ${EXCHANGE} because:`, response.data);
      } catch (err) {
        console.error(`Error fetching users trades from ${EXCHANGE} because:`, err);
      }
      return [];
    })();
  }

  fetchTransactionDetails(instrumentId, orderId) {
    var _this6 = this;

    return _asyncToGenerator(function* () {
      const timestamp = (Date.now() / 1000).toString();
      const method = 'GET';
      const path = `${TRANSACTION_DETAILS}?order_id=${orderId}&instrument_id=${instrumentId}`;
      const sign = _cryptoJs2.default.enc.Base64.stringify(_cryptoJs2.default.HmacSHA256(`${timestamp}${method}${path}`, _this6.secret));

      const options = {
        method,
        url: `${_this6.proxy}${BASE_URL}${path}`,
        headers: {
          'OK-ACCESS-KEY': _this6.apiKey,
          'OK-ACCESS-SIGN': sign,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': _this6.password,
          'Content-Type': 'application/json'
        }
      };

      try {
        const response = yield (0, _axios2.default)(options);
        if (response.status === 200) {
          return response.data;
        }
        console.error(`Status=${response.status} fetching users trades from ${EXCHANGE} because:`, response.data);
      } catch (err) {
        console.error(`Error fetching users trades from ${EXCHANGE} because:`, err);
      }
      return [];
    })();
  }

  // get filled orders and then get all transactions
  fetchMyTrades(instrumentId) {
    var _this7 = this;

    return _asyncToGenerator(function* () {
      let userTransactions = [];
      const filledOrders = yield _this7.fetchOrders(instrumentId, ['filled']);
      const orderIds = filledOrders.map(function (order) {
        return order.order_id;
      });

      // eslint-disable-next-line no-restricted-syntax
      for (const orderId of orderIds) {
        // eslint-disable-next-line no-await-in-loop
        const transactions = yield _this7.fetchTransactionDetails(instrumentId, orderId);
        userTransactions = userTransactions.concat(transactions);
        (0, _utils.delay)(_this7.RATE_LIMIT);
      }
      return userTransactions;
    })();
  }

  fetchInstruments() {
    var _this8 = this;

    return _asyncToGenerator(function* () {
      const options = {
        method: 'GET',
        url: `${_this8.proxy}${BASE_URL}${INSTRUMENTS}`,
        headers: {
          'Content-Type': 'application/json'
        }
      };

      try {
        const response = yield (0, _axios2.default)(options);
        if (response.status === 200) {
          return response.data;
        }
        console.error(`Status=${response.status} fetching instruments from ${EXCHANGE} because:`, response.data);
      } catch (err) {
        console.error(`Error fetching instruments from ${EXCHANGE} because:`, err);
      }
      return [];
    })();
  }

  loadMarkets() {
    var _this9 = this;

    return _asyncToGenerator(function* () {
      const instruments = yield _this9.fetchInstruments();
      const markets = {};
      instruments.forEach(function (instrument) {
        const base = _utils.COMMON_CURRENCIES[instrument.base_currency] ? _utils.COMMON_CURRENCIES[instrument.base_currency] : instrument.base_currency;
        const quote = _utils.COMMON_CURRENCIES[instrument.quote_currency] ? _utils.COMMON_CURRENCIES[instrument.quote_currency] : instrument.quote_currency;
        const pair = `${base}/${quote}`;

        markets[pair] = instrument;
      });
      return markets;
    })();
  }

  createOrder(instrumentId, orderRequest) {
    var _this10 = this;

    return _asyncToGenerator(function* () {
      const timestamp = (Date.now() / 1000).toString();
      const method = 'POST';

      const data = {
        instrument_id: instrumentId,
        type: orderRequest.type.toLowerCase(),
        side: orderRequest.side.toLowerCase(),
        margin_trading: '1',
        size: orderRequest.amount
      };

      if (orderRequest.type.toUpperCase() === 'LIMIT') {
        data.price = orderRequest.price;
      } else {
        // MARKET
        data.notional = orderRequest.notional;
      }

      const sign = _cryptoJs2.default.enc.Base64.stringify(_cryptoJs2.default.HmacSHA256(`${timestamp}${method}${ORDERS}${JSON.stringify(data)}`, _this10.secret));
      const options = {
        method,
        url: `${_this10.proxy}${BASE_URL}${ORDERS}`,
        headers: {
          'OK-ACCESS-KEY': _this10.apiKey,
          'OK-ACCESS-SIGN': sign,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': _this10.password,
          'Content-Type': 'application/json'
        },
        data
      };

      const response = yield (0, _axios2.default)(options);
      if (response.status === 200) {
        return response.data;
      }
      console.error(`Status=${response.status} creating order from ${EXCHANGE} because:`, response.data);
      return { result: false };
    })();
  }

  cancelOrder(orderId, instrumentId) {
    var _this11 = this;

    return _asyncToGenerator(function* () {
      const timestamp = (Date.now() / 1000).toString();
      const method = 'POST';

      const data = { instrument_id: instrumentId };
      const path = `${CANCEL_ORDERS}/${orderId}`;
      const sign = _cryptoJs2.default.enc.Base64.stringify(_cryptoJs2.default.HmacSHA256(`${timestamp}${method}${path}${JSON.stringify(data)}`, _this11.secret));
      const options = {
        method,
        url: `${_this11.proxy}${BASE_URL}${path}`,
        headers: {
          'OK-ACCESS-KEY': _this11.apiKey,
          'OK-ACCESS-SIGN': sign,
          'OK-ACCESS-TIMESTAMP': timestamp,
          'OK-ACCESS-PASSPHRASE': _this11.password,
          'Content-Type': 'application/json'
        },
        data
      };

      const response = yield (0, _axios2.default)(options);
      if (response.status === 200) {
        return response.data;
      }
      console.error(`Status=${response.status} cancelling order from ${EXCHANGE} because:`, response.data);
      return { result: false };
    })();
  }
}

exports.default = OkexClient;