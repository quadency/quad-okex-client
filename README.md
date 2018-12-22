# quad-okex-client

Client to allow easier access to OKEx' rest and websocket api.  We are using V1 because V3's documentation is incomplete and/or has imcomplete data.  For example, the ticker ws stream does not have 24h change or a way to calculate the data.  We will implement V3 as the documentation becomes more clear or when OKEx starts it's migration.

\* There are a handleful assets that have been normalized to ccxt's library. 

## Rest Example

```
import okex from 'quad-okex-client';

// For authenticated endpoints, provide object of credentials.  
// This is not required for public rest endpoints
const exchangeClient = new okex.RestClient({
  apiKey: 'your api key',
  secret: 'your secret',
  password: 'your passphrase',
});

// if using a proxy, set proxy value
if (PROXY_HOST) {
  exchangeClient.proxy = await getResolvedProxy();
}
const allMyOrderForBTCUSDT = await exchangeClient.fetchOrders('BTC-USDT')

```

## Websocket Example

```
import okex from 'quad-okex-client';

// For authenticated endpoints, provide object of credentials.  
// This is not required for public rest endpoints
const exchangeClient = new okex.WebsocketClient({
  apiKey: 'your api key',
  secret: 'your secret',
  password: 'your passphras',
});

exchangeClient.subscribeBalance((balanceUpdate)=>{
  console.log('My balance update:', balanceUpdate);
});

```
