'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _ws = require('ws');

var _ws2 = _interopRequireDefault(_ws);

var _pako = require('pako');

var _pako2 = _interopRequireDefault(_pako);

var _cryptoJs = require('crypto-js');

var _cryptoJs2 = _interopRequireDefault(_cryptoJs);

var _utils = require('./utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const WEBSOCKET_URI = 'wss://real.okex.com:10442/ws/v3';
const EXCHANGE = 'OKEX';

class OkexWebsocketClient {
  constructor(correlationId, userConfig = {}) {
    Object.keys(userConfig).forEach(key => {
      this[key] = userConfig[key];
    });
    this.correlationId = correlationId;
  }

  static getOrderType(type) {
    if (type === 0) {
      return 'LIMIT';
    }
    if (type === 1) {
      return 'MARKET';
    }
    return null;
  }

  /**
   *
   * -1 = cancelled,
   *  0 = unfilled,
   *  1 = partially filled,
   *  2 = fully filled,
   *  3 = cancel request in process,
   *  4 = order Failed,
   *  5 = order placing
   */
  static getOrderStatus(status) {
    if (status === -1 || status === 4) {
      return 'CANCELED';
    }
    if (status === 2) {
      return 'CLOSED';
    }
    return 'OPEN';
  }

  static getOrderSide(side) {
    if (side === 2) {
      return 'SELL';
    }
    return 'BUY';
  }

  login(socket) {
    if (socket.readyState === socket.OPEN) {
      const timestamp = (Date.now() / 1000).toString();
      const method = 'GET';
      const path = '/users/self/verify';
      const sign = _cryptoJs2.default.enc.Base64.stringify(_cryptoJs2.default.HmacSHA256(`${timestamp}${method}${path}`, this.secret));

      const request = JSON.stringify({
        event: 'login',
        parameters: {
          api_key: this.apiKey,
          passphrase: this.password,
          timestamp,
          sign
        }
      });
      socket.send(request);
    }
  }

  subscribe(subscription, callback) {
    const socket = new _ws2.default(WEBSOCKET_URI);
    let pingInterval;

    socket.onopen = () => {
      console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} connection open`);

      if (this.apiKey) {
        this.login(socket);
      } else if (Array.isArray(subscription)) {
        subscription.forEach(sub => {
          socket.send(JSON.stringify(sub));
        });
      } else {
        socket.send(JSON.stringify(subscription));
      }

      pingInterval = setInterval(() => {
        if (socket.readyState === socket.OPEN) {
          const pingMessage = { event: 'ping' };
          socket.send(JSON.stringify(pingMessage));
        }
      }, 5000);
    };

    socket.onmessage = message => {
      if (typeof message !== 'string') {
        const payload = _pako2.default.inflateRaw(message.data, { to: 'string' });
        if (!payload) {
          console.log('empty payload, skipping...');
          return;
        }

        const payloadObj = JSON.parse(payload);

        if (Array.isArray(payloadObj)) {
          payloadObj.forEach(msg => {
            if (msg.channel === 'login' && msg.data.result) {
              console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} user logged in`);
              if (socket.readyState === socket.OPEN) {
                socket.send(JSON.stringify(subscription));
              }
              return;
            }
            callback(msg);
          });
          return;
        }

        // json objects not pongs
        if (payloadObj.event !== 'pong') {
          callback(payloadObj);
        }
      }
    };

    socket.onclose = () => {
      console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} connection closed`);
      clearInterval(pingInterval);
    };

    socket.onerror = error => {
      console.log(`[correlationId=${this.correlationId}] error with ${EXCHANGE} connection because`, error);

      // reconnect if error
      this.subscribe(subscription, callback);
    };
    return () => {
      socket.close();
    };
  }

  subscribeAllSpots(callback) {
    const subscription = { event: 'addChannel', parameters: { binary: '1', type: 'spot_order_all' } };
    return this.subscribe(subscription, payloadObj => {
      const { channel, type, data } = payloadObj;

      if (channel === 'addChannel') {
        if (data.result) {
          console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} user subscribed to all spot orders`);
        }
        return;
      }

      if (type === 'spot_order_all') {
        const callbackPayload = data;
        callbackPayload.orderType = OkexWebsocketClient.getOrderType(data.orderType);
        callbackPayload.orderStatus = OkexWebsocketClient.getOrderStatus(data.status);
        callbackPayload.orderSide = OkexWebsocketClient.getOrderSide(data.side);
        callback(callbackPayload);
      }
    });
  }

  static updateBalanceCurrencies(balance) {
    const formattedBalance = { free: {}, freezed: {} };
    Object.keys(balance.free).forEach(coin => {
      if (_utils.COMMON_CURRENCIES[coin.toUpperCase()]) {
        formattedBalance.free[_utils.COMMON_CURRENCIES[coin.toUpperCase()]] = balance.free[coin];
        return;
      }
      formattedBalance.free[coin.toUpperCase()] = balance.free[coin];
    });

    Object.keys(balance.freezed).forEach(coin => {
      if (_utils.COMMON_CURRENCIES[coin.toUpperCase()]) {
        formattedBalance.freezed[_utils.COMMON_CURRENCIES[coin.toUpperCase()]] = balance.freezed[coin];
        return;
      }
      formattedBalance.freezed[coin.toUpperCase()] = balance.freezed[coin];
    });
    return formattedBalance;
  }

  subscribeBalance(callback) {
    const subscription = { event: 'addChannel', parameters: { binary: '1', type: 'spot_order_all' } };
    return this.subscribe(subscription, payloadObj => {
      const { channel, data } = payloadObj;
      if (channel) {
        if (channel === 'addChannel') {
          if (data.result) {
            console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} user subscribed to balances`);
          }
          return;
        }

        if (channel.startsWith('ok_sub_spot_') && channel.endsWith('_balance')) {
          const callbackPayload = OkexWebsocketClient.updateBalanceCurrencies(payloadObj.data.info);
          callback(callbackPayload);
        }
      }
    });
  }

  static updateTickerCurrencies(tick) {
    const updatedTick = tick;
    const [base, quote] = tick.instrument_id.split('-');

    const newBase = _utils.COMMON_CURRENCIES[base] ? _utils.COMMON_CURRENCIES[base].toUpperCase() : base.toUpperCase();
    const newQuote = _utils.COMMON_CURRENCIES[quote] ? _utils.COMMON_CURRENCIES[quote].toUpperCase() : quote.toUpperCase();
    const newSymbol = `${newBase}-${newQuote}`;
    updatedTick.instrument_id = newSymbol;
    return updatedTick;
  }

  subscribeTickers(instrumentIds, callback) {
    const CHANNEL = _utils.CHANNELS.TICKER;

    if (!instrumentIds.length) {
      throw new Error('must provide instrument ids');
    }

    const subscriptions = {
      op: 'subscribe',
      args: instrumentIds.map(instrumentId => `${CHANNEL}:${instrumentId}`)
    };

    return this.subscribe(subscriptions, payloadObj => {
      if (payloadObj.event && payloadObj.event === 'subscribe' && payloadObj.channel.split(':')[0] === CHANNEL) {
        console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} subscribed to ${payloadObj.channel}`);
        return;
      }

      const { table, data } = payloadObj;
      if (table === CHANNEL) {
        const [tick] = data;
        const callbackPayload = OkexWebsocketClient.updateTickerCurrencies(tick);
        callback(callbackPayload);
      }
    });
  }

  subscribeDepths(instrumentIds, callback) {
    const CHANNEL = _utils.CHANNELS.DEPTH;

    if (!instrumentIds.length) {
      throw new Error('must provide instrument ids');
    }

    const subscriptions = {
      op: 'subscribe',
      args: instrumentIds.map(instrumentId => `${CHANNEL}:${instrumentId}`)
    };

    return this.subscribe(subscriptions, payloadObj => {
      if (payloadObj.event && payloadObj.event === 'subscribe' && payloadObj.channel.split(':')[0] === CHANNEL) {
        console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} subscribed to ${payloadObj.channel}`);
        return;
      }

      const { table, data } = payloadObj;
      if (table === CHANNEL) {
        const [callbackPayload] = data;
        const [base, quote] = callbackPayload.instrument_id.split('-');
        const newBase = _utils.COMMON_CURRENCIES[base] ? _utils.COMMON_CURRENCIES[base].toUpperCase() : base.toUpperCase();
        const newQuote = _utils.COMMON_CURRENCIES[quote] ? _utils.COMMON_CURRENCIES[quote].toUpperCase() : quote.toUpperCase();
        data.instrument_id = `${newBase}-${newQuote}`;
        callback(callbackPayload);
      }
    });
  }

  subscribeTrades(instrumentIds, callback) {
    const CHANNEL = _utils.CHANNELS.TRADE;

    if (!instrumentIds.length) {
      throw new Error('must provide instrument ids');
    }

    const subscriptions = {
      op: 'subscribe',
      args: instrumentIds.map(instrumentId => `${CHANNEL}:${instrumentId}`)
    };

    return this.subscribe(subscriptions, payloadObj => {
      if (payloadObj.event && payloadObj.event === 'subscribe' && payloadObj.channel.split(':')[0] === CHANNEL) {
        console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} subscribed to ${payloadObj.channel}`);
        return;
      }

      const { table, data } = payloadObj;
      if (table === CHANNEL) {
        const callbackPayload = data.map(trade => {
          const [base, quote] = trade.instrument_id.split('-');
          const newBase = _utils.COMMON_CURRENCIES[base] ? _utils.COMMON_CURRENCIES[base].toUpperCase() : base.toUpperCase();
          const newQuote = _utils.COMMON_CURRENCIES[quote] ? _utils.COMMON_CURRENCIES[quote].toUpperCase() : quote.toUpperCase();
          return Object.assign(trade, { instrument_id: `${newBase}-${newQuote}` });
        });
        callback(callbackPayload);
      }
    });
  }
}

exports.default = OkexWebsocketClient;