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

const WEBSOCKET_URI = 'wss://real.okex.com:8443/ws/v3';
const EXCHANGE = 'OKEX';
const SOCKET_CLOSED = 'SOCKET_CLOSED';

class OkexWebsocketClient {
  constructor(correlationId, userConfig = {}) {
    Object.keys(userConfig).forEach(key => {
      this[key] = userConfig[key];
    });
    this.correlationId = correlationId;

    this.publicSocket = null;
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

  login(socket) {
    if (socket.readyState === socket.OPEN) {
      const timestamp = (Date.now() / 1000).toString();
      const method = 'GET';
      const path = '/users/self/verify';
      const sign = _cryptoJs2.default.enc.Base64.stringify(_cryptoJs2.default.HmacSHA256(`${timestamp}${method}${path}`, this.secret));

      const request = JSON.stringify({
        op: 'login',
        args: [this.apiKey, this.password, timestamp, sign]
      });
      socket.send(request);
    }
  }

  initSocket(subscription, callback, isPrivate = false) {
    const socket = new _ws2.default(WEBSOCKET_URI);
    let pingInterval;

    socket.onopen = () => {
      console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} connection open`);

      if (isPrivate) {
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
          socket.send('ping');
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

        if (payload !== 'pong') {
          const payloadObj = JSON.parse(payload);
          if (payloadObj.event === 'login' && payloadObj.event === 'login') {
            console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} user logged in`);
            if (socket.readyState === socket.OPEN) {
              socket.send(JSON.stringify(subscription));
            }
            return;
          }
          callback(payloadObj);
        }
      }
    };

    socket.onclose = () => {
      console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} connection closed`);
      clearInterval(pingInterval);
      callback(SOCKET_CLOSED);
    };

    socket.onerror = error => {
      console.log(`[correlationId=${this.correlationId}] error with ${EXCHANGE} connection because ${error}`);
      socket.close();
    };

    return socket;
  }

  subscribePublic(subscription, callback) {
    if (this.publicSocket && this.publicSocket.readyState === this.publicSocket.OPEN) {
      this.publicSocket.send(JSON.stringify(subscription));
    } else {
      this.publicSocket = this.initSocket(subscription, callback);
    }
    return () => this.publicSocket.close();
  }

  unsubscribePublic(unsubscribeMsg) {
    if (this.publicSocket && this.publicSocket.readyState === this.publicSocket.OPEN) {
      this.publicSocket.send(JSON.stringify(unsubscribeMsg));
    }
  }

  subscribePrivate(subscription, callback) {
    if (!this.apiKey) {
      throw new Error('api credentials required for private stream');
    }
    const socket = this.initSocket(subscription, callback, true);
    return () => socket.close();
  }

  subscribeOrders(instrumentIds, callback) {
    const CHANNEL = _utils.CHANNELS.ORDER;

    if (!instrumentIds.length) {
      throw new Error('must provide instrument ids');
    }

    const subscriptions = {
      op: 'subscribe',
      args: instrumentIds.map(instrumentId => `${CHANNEL}:${instrumentId}`)
    };

    return this.subscribePrivate(subscriptions, payloadObj => {
      if (payloadObj === SOCKET_CLOSED) {
        callback(SOCKET_CLOSED);
        return;
      }

      if (payloadObj.event && payloadObj.event === 'subscribe' && payloadObj.channel.split(':')[0] === CHANNEL) {
        console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} subscribed to ${payloadObj.channel}`);
        return;
      }

      const { table, data } = payloadObj;
      if (table === CHANNEL) {
        const [callbackPayload] = data;
        callbackPayload.type = callbackPayload.type.toUpperCase();
        callbackPayload.status = OkexWebsocketClient.getOrderStatus(parseFloat(callbackPayload.state));
        callbackPayload.side = callbackPayload.side.toUpperCase();
        callback(callbackPayload);
      }
    });
  }

  static updateBalanceCurrencies(balance) {
    const formattedBalance = balance;
    if (_utils.COMMON_CURRENCIES[balance.currency.toUpperCase()]) {
      formattedBalance.currency = _utils.COMMON_CURRENCIES[balance.currency.toUpperCase()];
    }
    return formattedBalance;
  }

  subscribeBalance(coins, callback) {
    const CHANNEL = _utils.CHANNELS.ACCOUNT;

    if (!coins.length) {
      throw new Error('must provide coins');
    }

    const subscription = {
      op: 'subscribe',
      args: coins.map(coin => `${CHANNEL}:${coin}`)
    };

    return this.subscribePrivate(subscription, payloadObj => {
      if (payloadObj === SOCKET_CLOSED) {
        callback(SOCKET_CLOSED);
        return;
      }

      if (payloadObj.event && payloadObj.event === 'subscribe' && payloadObj.channel.split(':')[0] === CHANNEL) {
        console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} subscribed to ${payloadObj.channel}`);
        return;
      }

      const { table, data } = payloadObj;
      if (table === CHANNEL) {
        const [balance] = data;
        const callbackPayload = OkexWebsocketClient.updateBalanceCurrencies(balance);
        callback(callbackPayload);
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

    return this.subscribePublic(subscriptions, payloadObj => {
      if (payloadObj === SOCKET_CLOSED) {
        callback(SOCKET_CLOSED);
        return;
      }

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

  unsubscribeTickers(instrumentIds) {
    const CHANNEL = _utils.CHANNELS.TICKER;
    const unsubscribeMsg = {
      op: 'unsubscribe',
      args: instrumentIds.map(instrumentId => `${CHANNEL}:${instrumentId}`)
    };
    this.unsubscribePublic(unsubscribeMsg);
  }

  subscribeDepths(instrumentIds, callback) {
    const CHANNEL = _utils.CHANNELS.DEPTH;

    if (!instrumentIds.length) {
      throw new Error('must provide instrument ids');
    }

    const subscription = {
      op: 'subscribe',
      args: instrumentIds.map(instrumentId => `${CHANNEL}:${instrumentId}`)
    };

    return this.subscribePublic(subscription, payloadObj => {
      if (payloadObj === SOCKET_CLOSED) {
        callback(SOCKET_CLOSED);
        return;
      }

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
        callbackPayload.instrument_id = `${newBase}-${newQuote}`;
        callback(callbackPayload);
      }
    });
  }

  unsubscribeDepths(instrumentIds) {
    const CHANNEL = _utils.CHANNELS.DEPTH;
    const unsubscribeMsg = {
      op: 'unsubscribe',
      args: instrumentIds.map(instrumentId => `${CHANNEL}:${instrumentId}`)
    };
    this.unsubscribePublic(unsubscribeMsg);
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

    return this.subscribePublic(subscriptions, payloadObj => {
      if (payloadObj === SOCKET_CLOSED) {
        callback(SOCKET_CLOSED);
        return;
      }

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

  unsubscribeTrades(instrumentIds) {
    const CHANNEL = _utils.CHANNELS.TRADE;
    const unsubscribeMsg = {
      op: 'unsubscribe',
      args: instrumentIds.map(instrumentId => `${CHANNEL}:${instrumentId}`)
    };
    this.unsubscribePublic(unsubscribeMsg);
  }
}

exports.default = OkexWebsocketClient;