const clients = {
  restClient: require('./okex-api.js'),
  wsClient: require('./okex-api-ws.js'),
}

module.exports = clients;
