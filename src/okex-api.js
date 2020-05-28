import axios from 'axios';
import CryptoJS from 'crypto-js';
import { delay, COMMON_CURRENCIES } from './utils';

const EXCHANGE = 'OKEX';
const BASE_URL = 'https://www.okex.com';

const WALLET = '/api/account/v3/wallet';
const SPOT_ACCOUNT = '/api/spot/v3/accounts';
const CURRENCIES = '/api/account/v3/currencies';
const INSTRUMENTS = '/api/spot/v3/instruments';
const ORDERS = '/api/spot/v3/orders';
const CANCEL_ORDERS = '/api/spot/v3/cancel_orders';
const TRANSACTION_DETAILS = '/api/spot/v3/fills';
const DEPOSIT_HISTORY = '/api/account/v3/deposit/history';
const WITHDRAWAL_HISTORY = '/api/account/v3/withdrawal/history';

class OkexClient {
  constructor(userConfig = {}) {
    Object.keys(userConfig).forEach((key) => {
      this[key] = userConfig[key];
    });
    this.proxy = '';
    this.RATE_LIMIT = 100;
  }

  static updateCurrencies(objects) {
    return objects.map((object) => {
      if (COMMON_CURRENCIES[object.currency]) {
        return Object.assign(object, { currency: COMMON_CURRENCIES[object.currency] });
      }
      return object;
    });
  }

  async fetchWallet() {
    const timestamp = (Date.now() / 1000).toString();
    const method = 'GET';
    const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${timestamp}${method}${WALLET}`, this.secret));

    const options = {
      method,
      url: `${this.proxy}${BASE_URL}${WALLET}`,
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.password,
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await axios(options);
      if (response.status === 200) {
        return OkexClient.updateCurrencies(response.data);
      }
      console.error(`Status=${response.status} fetching wallet balances from ${EXCHANGE} because:`, response.data);
    } catch (err) {
      console.error(`Error fetching wallet balances from ${EXCHANGE} because:`, err);
    }
    return [];
  }

  async fetchBalance() {
    const timestamp = (Date.now() / 1000).toString();
    const method = 'GET';
    const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${timestamp}${method}${SPOT_ACCOUNT}`, this.secret));

    const options = {
      method,
      url: `${this.proxy}${BASE_URL}${SPOT_ACCOUNT}`,
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.password,
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await axios(options);
      if (response.status === 200) {
        return OkexClient.updateCurrencies(response.data);
      }
      console.error(`Status=${response.status} fetching spot balances from ${EXCHANGE} because:`, response.data);
    } catch (err) {
      console.error(`Error fetching spot balances from ${EXCHANGE} because:`, err);
    }
    return [];
  }

  async fetchCurrencies() {
    const timestamp = (Date.now() / 1000).toString();
    const method = 'GET';
    const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${timestamp}${method}${CURRENCIES}`, this.secret));

    const options = {
      method,
      url: `${this.proxy}${BASE_URL}${CURRENCIES}`,
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.password,
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await axios(options);
      if (response.status === 200) {
        return response.data;
      }
      console.error(`Status=${response.status} fetching currencies from ${EXCHANGE} because:`, response.data);
    } catch (err) {
      console.error(`Error fetching currencies from ${EXCHANGE} because:`, err);
    }
    return [];
  }

  async fetchTrades(instrumentId) {
    const options = {
      method: 'GET',
      url: `${this.proxy}${BASE_URL}${INSTRUMENTS}/${instrumentId}/trades`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await axios(options);
      if (response.status === 200) {
        return response.data;
      }
      console.error(`Status=${response.status} fetching transaction history from ${EXCHANGE} because:`, response.data);
    } catch (err) {
      console.error(`Error fetching transaction history from ${EXCHANGE} because:`, err);
    }
    return [];
  }

  async fetchOrders(instrumentId, orderStatus = ['all']) {
    const timestamp = (Date.now() / 1000).toString();
    const method = 'GET';
    const statuses = orderStatus.join('%7C');
    const path = `${ORDERS}?status=${statuses}&instrument_id=${instrumentId}`;
    const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${timestamp}${method}${path}`, this.secret));

    const options = {
      method,
      url: `${this.proxy}${BASE_URL}${path}`,
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.password,
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await axios(options);
      if (response.status === 200) {
        return response.data;
      }
      console.error(`Status=${response.status} fetching users trades from ${EXCHANGE} because:`, response.data);
    } catch (err) {
      console.error(`Error fetching users trades from ${EXCHANGE} because:`, err);
    }
    return [];
  }

  async fetchOrder(orderId, instrumentId) {
    const timestamp = (Date.now() / 1000).toString();
    const method = 'GET';
    const path = `${ORDERS}/${orderId}?instrument_id=${instrumentId}`;
    const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${timestamp}${method}${path}`, this.secret));

    const options = {
      method,
      url: `${this.proxy}${BASE_URL}${path}`,
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.password,
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await axios(options);
      if (response.status === 200) {
        return response.data;
      }
      console.error(`Status=${response.status} fetching users trades from ${EXCHANGE} because:`, response.data);
    } catch (err) {
      console.error(`Error fetching users trades from ${EXCHANGE} because:`, err);
    }
    return [];
  }

  async fetchTransactionDetails(instrumentId, orderId) {
    const timestamp = (Date.now() / 1000).toString();
    const method = 'GET';
    const path = `${TRANSACTION_DETAILS}?order_id=${orderId}&instrument_id=${instrumentId}`;
    const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${timestamp}${method}${path}`, this.secret));

    const options = {
      method,
      url: `${this.proxy}${BASE_URL}${path}`,
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.password,
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await axios(options);
      if (response.status === 200) {
        return response.data;
      }
      console.error(`Status=${response.status} fetching users trades from ${EXCHANGE} because:`, response.data);
    } catch (err) {
      console.error(`Error fetching users trades from ${EXCHANGE} because:`, err);
    }
    return [];
  }

  // get filled orders and then get all transactions
  async fetchMyTrades(instrumentId) {
    let userTransactions = [];
    const filledOrders = await this.fetchOrders(instrumentId, ['filled']);

    const orderSideMap = {};
    filledOrders.forEach((order) => {
      orderSideMap[order.order_id] = order.side;
    });
    const orderIds = filledOrders.map(order => order.order_id);

    // eslint-disable-next-line no-restricted-syntax
    for (const orderId of orderIds) {
      // eslint-disable-next-line no-await-in-loop
      const rawTransactions = await this.fetchTransactionDetails(instrumentId, orderId);

      // we only want transactions on the same side order was made rather than all transactions
      const transactions = rawTransactions.filter(transaction => orderSideMap[transaction.order_id] === transaction.side);
      transactions.forEach((trade) => {
        if (parseFloat(trade.fee) === 0) {
          rawTransactions.forEach((rowTrade) => {
            if (trade.side === 'sell' && rowTrade.side === 'buy') {
              // eslint-disable-next-line no-param-reassign
              trade.fee = rowTrade.fee;
            }
          });
        }
      });
      userTransactions = userTransactions.concat(transactions);
      delay(this.RATE_LIMIT);
    }
    return userTransactions;
  }

  async fetchInstruments() {
    const options = {
      method: 'GET',
      url: `${this.proxy}${BASE_URL}${INSTRUMENTS}`,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const response = await axios(options);
      if (response.status === 200) {
        return response.data;
      }
      console.error(`Status=${response.status} fetching instruments from ${EXCHANGE} because:`, response.data);
    } catch (err) {
      console.error(`Error fetching instruments from ${EXCHANGE} because:`, err);
    }
    return [];
  }

  async loadMarkets() {
    const instruments = await this.fetchInstruments();
    const markets = {};
    instruments.forEach((instrument) => {
      const base = COMMON_CURRENCIES[instrument.base_currency] ? COMMON_CURRENCIES[instrument.base_currency] : instrument.base_currency;
      const quote = COMMON_CURRENCIES[instrument.quote_currency] ? COMMON_CURRENCIES[instrument.quote_currency] : instrument.quote_currency;
      const pair = `${base}/${quote}`;

      markets[pair] = instrument;
    });
    return markets;
  }

  async createOrder(instrumentId, orderRequest) {
    const timestamp = (Date.now() / 1000).toString();
    const method = 'POST';

    const data = {
      instrument_id: instrumentId,
      type: orderRequest.type.toLowerCase(),
      side: orderRequest.side.toLowerCase(),
      margin_trading: '1',
      size: orderRequest.amount,
    };

    if ((orderRequest.type).toUpperCase() === 'LIMIT') {
      data.price = orderRequest.price;
    } else { // MARKET
      data.notional = orderRequest.notional;
    }

    const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${timestamp}${method}${ORDERS}${JSON.stringify(data)}`, this.secret));
    const options = {
      method,
      url: `${this.proxy}${BASE_URL}${ORDERS}`,
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.password,
        'Content-Type': 'application/json',
      },
      data,
    };

    const response = await axios(options);
    if (response.status === 200) {
      return response.data;
    }
    console.error(`Status=${response.status} creating order from ${EXCHANGE} because:`, response.data);
    return { result: false };
  }

  async cancelOrder(orderId, instrumentId) {
    const timestamp = (Date.now() / 1000).toString();
    const method = 'POST';

    const data = { instrument_id: instrumentId };
    const path = `${CANCEL_ORDERS}/${orderId}`;
    const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${timestamp}${method}${path}${JSON.stringify(data)}`, this.secret));
    const options = {
      method,
      url: `${this.proxy}${BASE_URL}${path}`,
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.password,
        'Content-Type': 'application/json',
      },
      data,
    };

    const response = await axios(options);
    if (response.status === 200) {
      return response.data;
    }
    console.error(`Status=${response.status} cancelling order from ${EXCHANGE} because:`, response.data);
    return { result: false };
  }

  async fetchDeposits() {
    const timestamp = (Date.now() / 1000).toString();
    const method = 'GET';

    const path = DEPOSIT_HISTORY;
    const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${timestamp}${method}${path}`, this.secret));
    const options = {
      method,
      url: `${this.proxy}${BASE_URL}${path}`,
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.password,
        'Content-Type': 'application/json',
      },
    };

    const response = await axios(options);
    if (response.status === 200) {
      return OkexClient.updateCurrencies(response.data);
    }
    console.error(`Status=${response.status} fetching deposit history from ${EXCHANGE} because:`, response.data);
    return [];
  }

  async fetchWithdrawals() {
    const timestamp = (Date.now() / 1000).toString();
    const method = 'GET';

    const path = WITHDRAWAL_HISTORY;
    const sign = CryptoJS.enc.Base64.stringify(CryptoJS.HmacSHA256(`${timestamp}${method}${path}`, this.secret));
    const options = {
      method,
      url: `${this.proxy}${BASE_URL}${path}`,
      headers: {
        'OK-ACCESS-KEY': this.apiKey,
        'OK-ACCESS-SIGN': sign,
        'OK-ACCESS-TIMESTAMP': timestamp,
        'OK-ACCESS-PASSPHRASE': this.password,
        'Content-Type': 'application/json',
      },
    };

    const response = await axios(options);
    if (response.status === 200) {
      return OkexClient.updateCurrencies(response.data);
    }
    console.error(`Status=${response.status} fetching deposit history from ${EXCHANGE} because:`, response.data);
    return [];
  }

  async fetchOHLCV(instrumentId, interval, start, end) {
    const options = {
      method: 'GET',
      url: `${this.proxy}${BASE_URL}${INSTRUMENTS}/${instrumentId}/candles`,
      headers: {
        'Content-Type': 'application/json',
      },
      params: {
        start,
        end,
        granularity: interval,
      },
    };

    try {
      const response = await axios(options);
      if (response.status === 200) {
        return response.data;
      }
      console.error(`Status=${response.status} fetching instruments from ${EXCHANGE} because:`, response.data);
    } catch (err) {
      console.error(`Error fetching instruments from ${EXCHANGE} because:`, err);
    }
    return [];
  }
}

export default OkexClient;
