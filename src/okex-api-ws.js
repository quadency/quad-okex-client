import WebSocket from 'ws';
import pako from 'pako';
import CryptoJS from 'crypto-js';
import { COMMON_CURRENCIES } from './utils';


const WEBSOCKET_URI = 'wss://real.okex.com:10441/websocket';
const EXCHANGE = 'OKEX';


class OkexWebsocketClient {
  constructor(correlationId, userConfig = {}) {
    Object.keys(userConfig).forEach((key) => {
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
      const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${timestamp}${method}${path}`, this.secret));

      const request = JSON.stringify({
        event: 'login',
        parameters: {
          api_key: this.apiKey,
          passphrase: this.password,
          timestamp,
          sign,
        },
      });
      socket.send(request);
    }
  }

  subscribe(subscription, callback) {
    const socket = new WebSocket(WEBSOCKET_URI);
    let pingInterval;

    socket.onopen = () => {
      console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} connection open`);

      if (this.apiKey) {
        this.login(socket);
      } else if (Array.isArray(subscription)) {
        subscription.forEach((sub) => {
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

    socket.onmessage = (message) => {
      if (typeof message !== 'string') {
        const payload = pako.inflateRaw(message.data, { to: 'string' });
        const payloadObj = JSON.parse(payload);

        if (Array.isArray(payloadObj)) {
          payloadObj.forEach((msg) => {
            if (msg.channel === 'login' && msg.data.result) {
              console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} user logged in`);
              socket.send(JSON.stringify(subscription));
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

    socket.onerror = (error) => {
      console.log(`[correlationId=${this.correlationId}] error with ${EXCHANGE} connection because`, error);

      // reconnect if error
      this.subscribe(subscription, callback);
    };
    return () => { socket.close(); };
  }

  subscribeAllSpots(callback) {
    const subscription = { event: 'addChannel', parameters: { binary: '1', type: 'spot_order_all' } };
    return this.subscribe(subscription, (payloadObj) => {
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
    Object.keys(balance.free).forEach((coin) => {
      if (COMMON_CURRENCIES[coin.toUpperCase()]) {
        formattedBalance.free[COMMON_CURRENCIES[coin.toUpperCase()]] = balance.free[coin];
        return;
      }
      formattedBalance.free[coin.toUpperCase()] = balance.free[coin];
    });

    Object.keys(balance.freezed).forEach((coin) => {
      if (COMMON_CURRENCIES[coin.toUpperCase()]) {
        formattedBalance.freezed[COMMON_CURRENCIES[coin.toUpperCase()]] = balance.freezed[coin];
        return;
      }
      formattedBalance.freezed[coin.toUpperCase()] = balance.freezed[coin];
    });
    return formattedBalance;
  }

  subscribeBalance(callback) {
    const subscription = { event: 'addChannel', parameters: { binary: '1', type: 'spot_order_all' } };
    return this.subscribe(subscription, (payloadObj) => {
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
    const [base, quote] = tick.symbol.split('_');

    const newBase = COMMON_CURRENCIES[base] ? COMMON_CURRENCIES[base].toUpperCase() : base.toUpperCase();
    const newQuote = COMMON_CURRENCIES[quote] ? COMMON_CURRENCIES[quote].toUpperCase() : quote.toUpperCase();
    const newSymbol = `${newBase}-${newQuote}`;
    updatedTick.symbol = newSymbol;
    return updatedTick;
  }

  subscribeTickers(instrumentIds, callback) {
    if (!instrumentIds.length) {
      throw new Error('must provide instrument ids');
    }

    const subscriptions = instrumentIds.map((instrumentId) => {
      const [base, quote] = instrumentId.split('-');
      return {
        event: 'addChannel',
        parameters: {
          base, binary: '1', product: 'spot', quote, type: 'ticker',
        },
      };
    });
    return this.subscribe(subscriptions, (payloadObj) => {
      const { channel, type, data } = payloadObj;
      if (channel === 'addChannel') {
        if (data.result) {
          console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} subscribed to ticker base=${payloadObj.base} quote=${payloadObj.quote}`);
        }
        return;
      }
      if (type === 'ticker') {
        const callbackPayload = OkexWebsocketClient.updateTickerCurrencies(data);
        callback(callbackPayload);
      }
    });
  }

  subscribeDepths(instrumentIds, callback) {
    if (!instrumentIds.length) {
      throw new Error('must provide instrument ids');
    }
    const subscriptions = instrumentIds.map((instrumentId) => {
      const [base, quote] = instrumentId.split('-');
      return {
        event: 'addChannel',
        parameters: {
          base, binary: '1', product: 'spot', quote, type: 'depth',
        },
      };
    });
    return this.subscribe(subscriptions, (payloadObj) => {
      const { channel, type, data } = payloadObj;

      if (channel === 'addChannel') {
        if (data.result) {
          console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} subscribed to order depth base=${payloadObj.base} quote=${payloadObj.quote}`);
        }
        return;
      }

      if (type === 'depth') {
        const { base, quote } = payloadObj;
        const newBase = COMMON_CURRENCIES[base] ? COMMON_CURRENCIES[base].toUpperCase() : base.toUpperCase();
        const newQuote = COMMON_CURRENCIES[quote] ? COMMON_CURRENCIES[quote].toUpperCase() : quote.toUpperCase();
        const symbol = `${newBase}-${newQuote}`;
        const callbackPayload = Object.assign({ symbol }, data);
        callbackPayload.type = data.init ? 'SNAPSHOT' : 'DELTA';
        callback(callbackPayload);
      }
    });
  }

  subscribeTrades(instrumentIds, callback) {
    if (!instrumentIds.length) {
      throw new Error('must provide instrument ids');
    }
    const subscriptions = instrumentIds.map((instrumentId) => {
      const [base, quote] = instrumentId.split('-');
      return {
        event: 'addChannel',
        parameters: {
          base, binary: '1', product: 'spot', quote, type: 'deal',
        },
      };
    });
    return this.subscribe(subscriptions, (payloadObj) => {
      const { channel, type, data } = payloadObj;

      if (channel === 'addChannel') {
        if (data.result) {
          console.log(`[correlationId=${this.correlationId}] ${EXCHANGE} subscribed to trades base=${payloadObj.base} quote=${payloadObj.quote}`);
        }
        return;
      }

      if (type === 'deal') {
        const { base, quote } = payloadObj;
        const newBase = COMMON_CURRENCIES[base] ? COMMON_CURRENCIES[base].toUpperCase() : base.toUpperCase();
        const newQuote = COMMON_CURRENCIES[quote] ? COMMON_CURRENCIES[quote].toUpperCase() : quote.toUpperCase();
        const symbol = `${newBase}-${newQuote}`;

        data.forEach((trade) => {
          const callbackPayload = Object.assign({ symbol }, trade);
          callbackPayload.side = OkexWebsocketClient.getOrderSide(trade.side);
          callback(callbackPayload);
        });
      }
    });
  }
}

export default OkexWebsocketClient;
