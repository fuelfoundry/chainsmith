const {createProvider, createWallet} = require("./common");
const {cfg, setCfg} = require("./configs");
const {getDb} = require("../db/db");
const thetajs = require("@thetalabs/theta-js");

function forgeWallet() {

    const wallet = thetajs.Wallet.createRandom()

   console.log(wallet)
 //   return wallet.connect(provider);

  //  const db = getDb();
  //  setCfg('testnet');

  //  const provider = createProvider(cfg().mainchainIDStr, cfg().mainchainRPC);
    //const wallet = createWallet(provider, null, password);


    console.log("-----------------------------------------------")
}
