const mainchainEthRpc = (httpAddress = "127.0.0.1", httpPort = 18888, wsAddress = "127.0.0.1", wsPort = 18889) => `
theta:
  rpcEndpoint: "http://127.0.0.1:16888/rpc"
node:
  skipInitializeTestWallets: true
rpc:
  enabled: true
  httpAddress: "${httpAddress}"
  httpPort: ${httpPort}
  wsAddress: "${wsAddress}"
  wsPort: ${wsPort}
  timeoutSecs: 600 
  maxConnections: 2048
log:
  levels: "*:debug"`

module.exports = {mainchainEthRpc}
