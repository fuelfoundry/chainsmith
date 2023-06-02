const mainnetWalletConfig = (rpcAddress = "127.0.0.1", rpcPort = 16888) => `
# Theta mainnet wallet node configuration
storage:
  statePruningRetainedBlocks: 2048
p2p:
  opt: 0
  port: 30001
  seeds: 3.20.109.241:21000,18.223.165.134:21000,35.184.232.41:21000,35.230.172.8:21000,34.83.204.5:21000
  minNumPeers: 24
  maxNumPeers: 96
  natMapping: true
rpc:
  port: ${rpcPort}
  enabled: true
  address: ${rpcAddress}
log:
  levels: "*:info,guardian:debug"
 `

module.exports = {mainnetWalletConfig}
