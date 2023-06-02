const mainnetMainchainRpc = require('./mainnet-mainchain-eth-rpc');
const {ethRpc} = require("./eth-rpc");


const mainnetEthRpc = ethRpc();
const subchainEthRpc = ethRpc("https://127.0.0.16900/rpc", 19888, 19889)

const testnetMainchainWalletRpc = `# Theta configuration
genesis:
  hash: "0xa58cb754a23975c872ef06d8b54baf16eec88ad60f966368b950a6c16ae52ed9"
consensus:
  minBlockInterval: 6
p2p:
  port: 12000
  seeds: 54.151.72.227:15872
log:
  levels: "*:info"
  #levels: "*:debug"
rpc:
  enabled: true`

const subchainValConfig = (data) => {
    const {tfuel_token_bank, min_block_interval, chain_registrar, tnt20_token_bank, tnt721_token_bank, tnt1155_token_bank, update_interval, subchain_id, genesis_blockhash} = data
    return `
# FuelFoundry ChainSmith generated subchain validator configuration
genesis:
  hash: "${genesis_blockhash}"
p2p:
  port: 12100
rpc:
  enabled: true
log:
  levels: "*:info"
  #levels: "*:debug"
consensus:
  minBlockInterval: ${min_block_interval}
subchain:
  mainchainEthRpcURL: "http://localhost:18888/rpc"
  subchainEthRpcURL: "http://localhost:19888/rpc"
  chainRegistrarOnMainchain: "${chain_registrar}"
  mainchainTFuelTB: "${tfuel_token_bank}"
  mainchainTNT20TB: "${tnt20_token_bank}"
  mainchainTNT721TB: "${tnt721_token_bank}"
  mainchainTNT1155TB: "${tnt1155_token_bank}"
  updateInterval: ${update_interval}
  chainID: ${subchain_id}`
}

module.exports = {mainnetMainchainRpc, mainnetEthRpc, subchainEthRpc, testnetMainchainWalletRpc, subchainValConfig}
