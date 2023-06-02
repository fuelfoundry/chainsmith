require('isomorphic-fetch');
const {setCfg, cfg} = require("./configs")
const thetajs = require("@thetalabs/theta-js");
const {ChainRegistrarOnMainchainContract, TNT20TokenInterface, createProvider, createWallet, expandTo18Decimals, promptForWalletPassword} = require("./common.js")
const {NOW} = require("../constants");
const {getDb} = require("../db/db");
const {sleep} = require("./common");

async function printAllRegisteredSubchains(db, subchain_id, subchain_chain_id, chainRegistrarOnMainchainContract) {

    let registeredChainIDs = await chainRegistrarOnMainchainContract.getAllSubchainIDs()
    console.log("All registered subchains:")
    let numRegisteredSubchains = registeredChainIDs.length
    for (i = 0; i < numRegisteredSubchains; i ++) {
        let subchainID = registeredChainIDs[i];
        let subchainMetadata = await chainRegistrarOnMainchainContract.getSubchainMetadata(subchainID)
        console.log(`Subchain, ID: ${subchainID.toString()}, metadata: ${subchainMetadata}`)

        if (subchainID == subchain_chain_id) {

            // metadata
            //
            db.prepare('UPDATE subchain SET metadata = ? WHERE id = ?').run(String(subchainMetadata), parseInt(String(subchain_id),10));
        }
    }
}

async function registerSubchain(subchain_id, mainchain, subchain_chain_id, govtoken_address, genesisHash, key, password) {

    const db = getDb();
    setCfg(mainchain);

    db.prepare('UPDATE subchain SET last_state = ? WHERE id = ?').run(5, subchain_id);

    const provider = createProvider(cfg().mainchainIDStr, cfg().mainchainRPC);
    const wallet = createWallet(provider, key, password);

    const wThetaContract = new thetajs.Contract(cfg().wTHETAAddr, TNT20TokenInterface.abi, wallet)
    const chainRegistrarOnMainchainContract = new thetajs.Contract(cfg().registrarOnMainchainAddr, ChainRegistrarOnMainchainContract.abi, wallet)
    const {dynasty} = await chainRegistrarOnMainchainContract.getDynasty();

    const dynasty_number = dynasty.toString();
    console.log('');
    console.log('Wallet address    :', wallet.address);
    console.log('Registrar address :', chainRegistrarOnMainchainContract.address);
    console.log('Dynasty           :', dynasty_number);
    console.log('');

    let subchainCollateral = expandTo18Decimals(10000) // 10000 wTHETA
    console.log('Approve', subchainCollateral.toString(), 'wTHETA spendable by Registrar', chainRegistrarOnMainchainContract.address);

    // dynasty, last_state
    //
    db.prepare('UPDATE subchain SET dynasty = ?, last_state = ? WHERE id = ?').run(dynasty_number, 6, subchain_id);
    await sleep(6420);
    await wThetaContract.approve(chainRegistrarOnMainchainContract.address, subchainCollateral);

    // last_state
    //
    db.prepare('UPDATE subchain SET last_state = ? WHERE id = ?').run(7, subchain_id);
    console.log("subchain state: 7")
    await printAllRegisteredSubchains(db, subchain_id, subchain_chain_id, chainRegistrarOnMainchainContract)
    await sleep(6420);
    console.log("")

    //(subchain_id, mainchain, subchain_chainid, genesis_hash, key, password)
    //let registerTx = await chainRegistrarOnMainchainContract.registerSubchain(cfg().subchainID, cfg().govTokenContractAddr, subchainCollateral, genesisHash)

    // last_state
    //
    db.prepare('UPDATE subchain SET last_state = ? WHERE id = ?').run(8, subchain_id);

    let registerTx = await chainRegistrarOnMainchainContract.registerSubchain(subchain_chain_id, govtoken_address, subchainCollateral, genesisHash)
    console.log("Registering subchain", subchain_chain_id)
    console.log("Subchain registration tx: ", registerTx.hash);
    console.log("")

    // last_state
    //
    db.prepare('UPDATE subchain SET last_state = ? WHERE id = ?').run(9, subchain_id);
    await sleep(6420);
    await printAllRegisteredSubchains(db, subchain_id, subchain_chain_id, chainRegistrarOnMainchainContract)

    //db.prepare('UPDATE govtoken SET last_state = ? WHERE id = ?').run(9, subchain_id);
    console.log("Subchain registered successfully")
/*
    db.prepare(`UPDATE subchain
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


 */
    await sleep(8400);
    db.prepare('UPDATE subchain SET tx_hash = ?, last_state = ? WHERE id = ?').run(registerTx.hash, 10, subchain_id);

}

//
// MAIN
//  node registerSubchain.js testnet <GENESIS_BLOCK_HASH> <PATH/TO/ADMIN_WALLET_KEYSTORE_FILE> <ADMIN_WALLET_PASSWORD>

module.exports = {
    registerSubchain
};
