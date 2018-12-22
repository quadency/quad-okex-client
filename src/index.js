import OkexClient from './okex-api';
import OkexWebsocketClient from './okex-api-ws';

module.exports = {
  RestClient: OkexClient,
  WebsocketClient: OkexWebsocketClient,
};
