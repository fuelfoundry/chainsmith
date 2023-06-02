const ethRpc = (rpcEndpoint = "http://127.0.0.1:16888/rpc", httpPort = 18888, wsPort = 18889) => `theta:
  rpcEndpoint: "http://127.0.0.1:16888/rpc"
node:
  skipInitializeTestWallets: true
rpc:
  enabled: true
  httpAddress: "0.0.0.0"
  httpPort: ${httpPort}
  wsAddress: "0.0.0.0"
  wsPort: ${wsPort}
  timeoutSecs: 600 
  maxConnections: 2048
log:
  levels: "*:debug"`


module.exports = {ethRpc}
