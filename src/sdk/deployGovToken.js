require('isomorphic-fetch');
const {getDb} = require("../db/db");
const {setCfg, cfg} = require("./configs")
const thetajs = require("@thetalabs/theta-js");
const {ChainRegistrarOnMainchainContract, SubchainGovernanceTokenContract, createProvider, createWallet, expandTo18Decimals, promptForWalletPassword} = require("./common.js")
const {NOW} = require("../constants");

//deploySubchainGovernanceToken             (govtoken_id, mainchain, name, symbol, init_distr_wallet_keystore_id, init_distr_wallet, admin, minterKeystore, minterKeyPassword);
async function deploySubchainGovernanceToken(govtoken_id, mainchain, name, symbol, init_distr_wallet_keystore_id, initDistrWallet, admin, deployerKey, password) {

    const db = getDb();
    setCfg(mainchain);
    const provider = createProvider(cfg().mainchainIDStr, cfg().mainchainRPC);
    const wallet = createWallet(provider, deployerKey, password);

    const chainRegistrarOnMainchainContract = new thetajs.Contract(cfg().registrarOnMainchainAddr, ChainRegistrarOnMainchainContract.abi, wallet)
    const validatorStakeManagerAddr = await chainRegistrarOnMainchainContract.vsm()
    const {dynasty} = await chainRegistrarOnMainchainContract.getDynasty();

    // add to db
    //
    const mintDeployerAddress = wallet.address;
    const mintChainRegistrarOnMainchainContract = chainRegistrarOnMainchainContract.address;
    const mintDynasty = dynasty.toString();

    console.log('');
    console.log("mainchainRPC      :", cfg().mainchainRPC);
    console.log('Deployer address  :', mintDeployerAddress);
    console.log('Registrar address :', mintChainRegistrarOnMainchainContract);
    console.log('Dynasty           :', mintDynasty);
    console.log('');

    db.prepare('UPDATE govtoken SET last_state = ? WHERE id = ?').run(5, govtoken_id);

    // add to db
    //
    const decimals = 18; // hacky hack Mr. J :P
    let maxSupply = expandTo18Decimals(1000000000); // 1 Billion
    let initMintAmount = expandTo18Decimals(500000000); // 500 Million
    let stakerRewardPerBlock = expandTo18Decimals(2); // 2 tokens per block, the issuance will last for approximately 49 years
    const minter = validatorStakeManagerAddr;

    const contractToDeploy = new thetajs.ContractFactory(SubchainGovernanceTokenContract.abi, SubchainGovernanceTokenContract.bytecode, wallet);
    let result = await contractToDeploy.deploy(name, symbol, decimals, maxSupply, minter, stakerRewardPerBlock, initDistrWallet, initMintAmount, admin);
    const contractAddress = result.contract_address;

    db.prepare('UPDATE govtoken SET last_state = ? WHERE id = ?').run(7, govtoken_id);
    // add to db
    //
    const subchainGovToken = new thetajs.Contract(contractAddress, SubchainGovernanceTokenContract.abi, wallet);
    const mintedGovTokenAddress = await subchainGovToken.address;
    const mintedGovTokenName = await subchainGovToken.name();
    const mintedGovTokenSymbol = await subchainGovToken.symbol();
    const mintedGovTokenDecimals = await subchainGovToken.decimals();
    const mintedStakerRewardsPerBlock = (await subchainGovToken.stakerRewardPerBlock()).toString();
    const mintedInitialDistrWalletBalance = (await subchainGovToken.balanceOf(initDistrWallet)).toString();
    const mintedGovTokenHash = result.hash;
    const mintedContractAddress = contractAddress;

    // subchainGovToken = await SubchainGovernanceTokenContract.new(
    // name, symbol, decimals, maxSupply,
    // minter, stakerRewardPerBlock, initDistrWallet, initMintAmount, admin)
    //

    // if DEBUG == true
    //
    console.log("")
    console.log("----------- Subchain Governance Token Details -----------")
    console.log("Tx Hash              :", mintedGovTokenHash);
    console.log("Contract Address     :", mintedContractAddress);
    console.log("Contract Address (v) :", mintedGovTokenAddress);
    console.log("Name                 :", mintedGovTokenName);
    console.log("Symbol               :", mintedGovTokenSymbol);
    console.log("Decimals             :", mintedGovTokenDecimals);
    console.log("StakerRewardPerBlock :", mintedStakerRewardsPerBlock);
    console.log("Init distr wallet    :", initDistrWallet)
    console.log("init wallet balance  :", mintedInitialDistrWalletBalance)
    console.log("---------------------------------------------------------")
    console.log("")

    db.prepare(`UPDATE govtoken
    SET 
        address = ?,
        name = ?,
        symbol = ?,
        decimals = ?,
        staker_reward_per_block = ?,
        tx_hash = ?,
        dynasty = ?,
        last_state = ?,
        last_update = ?
    WHERE
        id = ?`).run(
        mintedGovTokenAddress,
        mintedGovTokenName,
        mintedGovTokenSymbol,
        mintedGovTokenDecimals,
        mintedStakerRewardsPerBlock,
        mintedGovTokenHash,
        mintDynasty,
        10,
        NOW(),
        govtoken_id
    );
}

module.exports = {
    deploySubchainGovernanceToken
};