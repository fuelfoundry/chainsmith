require('isomorphic-fetch');
const { BigNumber } = require("@ethersproject/bignumber");
const {setCfg, cfg} = require("./configs")
const thetajs = require("@thetalabs/theta-js");
const {ChainRegistrarOnMainchainContract, SubchainGovernanceTokenContract, DontCare, createProvider, createWallet, expandTo18Decimals, printValidatorSetForDynasty} = require("./common.js");
const {getDb} = require("../db/db");
const {sleep} = require("./common");

async function stakeToSubchainValidator(substake_id, mainchain, subchainChainId, govTokenContractAddress, amountInWei, validatorAddr, wThetaCollateralAmountInWei, tFuelFeeInWei, key, password) {

    //wThetaCollateralAmountInWei = BigNumber.from(0);
    //tFuelFeeInWei = BigNumber.from(0);

    const db = getDb();
    setCfg(mainchain);

    const provider = createProvider(cfg().mainchainIDStr, cfg().mainchainRPC);
    const wallet = createWallet(provider, key, password);

    const wThetaContract = new thetajs.Contract(cfg().wTHETAAddr, SubchainGovernanceTokenContract.abi, wallet) // FIXME: should use wTHETA.abi instead, but SubchainGovernanceTokenContract also has the approve method, so can be used here
    //    const govTokenContract = new thetajs.Contract(cfg().govTokenContractAddr, SubchainGovernanceTokenContract.abi, wallet)
    const govTokenContract = new thetajs.Contract(govTokenContractAddress, SubchainGovernanceTokenContract.abi, wallet)
    const totalGovTokenSupply = await govTokenContract.totalSupply();
    const stakerRewardPerBlock = await govTokenContract.stakerRewardPerBlock();
    const chainRegistrarOnMainchainContract = new thetajs.Contract(cfg().registrarOnMainchainAddr, ChainRegistrarOnMainchainContract.abi, wallet)
    const vcmAddr = await chainRegistrarOnMainchainContract.vcm();
    const vsmAddr = await chainRegistrarOnMainchainContract.vsm();
    const {dynasty} = await chainRegistrarOnMainchainContract.getDynasty();

    console.log('');
    console.log('SubchainID:',subchainChainId);
    console.log('Gov token contract:', govTokenContractAddress);
    console.log('Gov token supply  :', totalGovTokenSupply.toString());
    console.log('Reward per block  :', stakerRewardPerBlock.toString());
    console.log('Wallet address    :', wallet.address);
    console.log('VCM address       :', vcmAddr);
    console.log('VSM address       :', vsmAddr);
    console.log('Dynasty           :', dynasty.toString());
    console.log('');
    console.log('wThetaCollateralAmountInWei:',wThetaCollateralAmountInWei)

    //substake_id, mainchain, subchainChainId, govTokenContractAddress, amountInWei, validatorAddr, wThetaCollateralAmountInWei, tFuelFeeInWei, key, password
    //vcmAddr, vsmAddr, dynasty
    //
    //substake_id, mainchain, govTokenContractAddress, amountInWei, validatorAddr, wThetaCollateralAmountInWei, tFuelFeeInWei, govTokenAdminKey, password

    console.log(`Before staking, ValidatorSet for the current dyansty ${dynasty.toString()}:`);
    let validator_set = await printValidatorSetForDynasty(substake_id, subchainChainId, chainRegistrarOnMainchainContract, dynasty);

    // add to db ***
    // JSON.stringify(validator_set)

    console.log(`Before staking, ValidatorSet for the next dyansty ${dynasty.add(1).toString()}:`);

    db.prepare('UPDATE substake SET vcm_address = ?, vsm_address = ?, dynasty = ?, last_state = ? WHERE id = ?').run(vcmAddr, vsmAddr, dynasty.toString(), 4, substake_id);
    await sleep(1000);
    await printValidatorSetForDynasty(substake_id, subchainChainId, chainRegistrarOnMainchainContract, dynasty.add(1));

    if (wThetaCollateralAmountInWei == DontCare) {
        wThetaCollateralAmountInWei = expandTo18Decimals(1000) // 1000 wTHETA

        // add to db ***
        // update substake wThetaCollateralAmountInWei = 1000 where = substake_id
    }

    if (!wThetaCollateralAmountInWei.isZero()) {

        console.log('Approve', wThetaCollateralAmountInWei.toString(), 'wTHETA spendable by VCM', vcmAddr);

        db.prepare('UPDATE substake SET last_state = ? WHERE id = ?').run(5, substake_id);
        await sleep(1000);
        await wThetaContract.approve(vcmAddr, wThetaCollateralAmountInWei);
    
        let depositCollateralTx = await chainRegistrarOnMainchainContract.depositCollateral(subchainChainId, validatorAddr, wThetaCollateralAmountInWei);
        console.log("Deposit wTHETA collateral tx: ", depositCollateralTx.hash);

        // add to db ***
        // update substake wThetaStakeHash = depositCollateralTx.hash where = substake_id
        db.prepare('UPDATE substake SET wtheta_collateral_tx_hash = ?, last_state = ? WHERE id = ?').run(depositCollateralTx.hash, 6, substake_id);
        await sleep(1000);
    }

    console.log('Approve', amountInWei.toString(), 'Gov token spendable by VSM', vsmAddr)

    let approveGovTokenTx = await govTokenContract.approve(vsmAddr, amountInWei);
    console.log("Approving Gov Token tx: ", approveGovTokenTx.hash);

    // add approval to db ***
    // govtoken stake
    db.prepare('UPDATE substake SET govtoken_approve_tx_hash = ?, last_state = ? WHERE id = ?').run(approveGovTokenTx.hash, 6, substake_id);
    await sleep(1000);

    console.log('Stake', amountInWei.toString(), 'Gov token from the wallet to validator', validatorAddr, '\n')

    if (tFuelFeeInWei == DontCare) {
        tFuelFeeInWei = expandTo18Decimals(cfg().initialFee).mul(2)
    }
    
    console.log('Subchain ID       :', subchainChainId)
    console.log('Validator address :', validatorAddr)
    console.log('Stake amount      :', amountInWei.toString(), "GovTokenWei")
    console.log('TFuel fee         :', tFuelFeeInWei.toString(), "TFuelWei")

    // amountInWei.toString()
    // tFuelFeeInWei.toString()
    db.prepare('UPDATE substake SET last_state = ? WHERE id = ?').run(7, substake_id);
    await sleep(1000);
    let depositStakeTx = await chainRegistrarOnMainchainContract.depositStake(subchainChainId, validatorAddr, amountInWei, {value: tFuelFeeInWei.toString()});
    console.log("Attempt to stake", amountInWei.toString(), 'Gov tokens to validator', validatorAddr, '\n');
    console.log("Deposit stake tx: ", depositStakeTx.hash);

    // add to db ***
    // govtoken stake and tfuel_fee_in_wei_tx_hash
    console.log(`After staking, ValidatorSet for the current dyansty ${dynasty.toString()}:`);
    db.prepare('UPDATE substake SET govtoken_stake_tx_hash = ?, tfuel_fee_tx_hash = ?, last_state = ? WHERE id = ?').run(depositStakeTx.hash, depositStakeTx.hash, 8, substake_id);
    await sleep(1000);
    await printValidatorSetForDynasty(substake_id, subchainChainId, chainRegistrarOnMainchainContract, dynasty);

    db.prepare('UPDATE substake SET last_state = ? WHERE id = ?').run(9, substake_id);
    console.log(`After staking, ValidatorSet for the next dyansty ${dynasty.add(1).toString()}:`);
    let next_validator_set = await printValidatorSetForDynasty(substake_id, subchainChainId, chainRegistrarOnMainchainContract, dynasty.add(1));

    // add to db: JSON.stringify(validator_set)
    db.prepare('UPDATE substake SET next_validator_set = ?, next_dynasty = ?, last_state = ? WHERE id = ?').run(JSON.stringify(next_validator_set),dynasty.add(1).toString(), 10, substake_id);
}

//
// MAIN
//

//
// Privatenet examples (where the mainchain chainID is 366)
//
// node depositStake.js privatenet 100000000000000000000000 0x2E833968E5bB786Ae419c4d13189fB081Cc43bab ~/.thetacli/keys/encrypted/2E833968E5bB786Ae419c4d13189fB081Cc43bab qwertyuiop
//
// When the collateral and minimum fee requirements are satisfied, staking requires neither wTHETA collateral nor TFuel fee
// node depositStake.js privatenet 10000000 0x2E833968E5bB786Ae419c4d13189fB081Cc43bab 0 0 ~/.thetacli/keys/encrypted/2E833968E5bB786Ae419c4d13189fB081Cc43bab qwertyuiop

//
// Testnet examples (where the mainchain chainID is 365)
//
// node depositStake.js testnet 10000000000000000000000000 0x2E833968E5bB786Ae419c4d13189fB081Cc43bab ~/.thetacli/keys/encrypted/2E833968E5bB786Ae419c4d13189fB081Cc43bab
// node depositStake.js testnet 10000000000000000000000000 0x11Ac5dCCEa0603a24E10B6f017C7c3285D46CE8e ~/.thetacli/keys/encrypted/2E833968E5bB786Ae419c4d13189fB081Cc43bab
// node depositStake.js testnet 15000000000000000000000000 0x2f63946ff190Bd82E053fFF553ef208FbDEB2e67 ~/.thetacli/keys/encrypted/2E833968E5bB786Ae419c4d13189fB081Cc43bab
// node depositStake.js testnet 18000000000000000000000000 0x372D9d124D9B2B5598109009525533578aDF9d45 ~/.thetacli/keys/encrypted/2E833968E5bB786Ae419c4d13189fB081Cc43bab
//
// When the collateral and minimum fee requirements are satisfied, staking requires neither wTHETA collateral nor TFuel fee
// node depositStake.js testnet 10000000 0x372D9d124D9B2B5598109009525533578aDF9d45 0 0 ~/.thetacli/keys/encrypted/2E833968E5bB786Ae419c4d13189fB081Cc43bab qwertyuiop

/*
if (process.argv && !(process.argv.length >= 6 && process.argv.length <= 9)) {
    console.log("Usage:");
    console.log("  node depositStake.js <networkType> <govTokenAmountInWei> <validatorAddr> <stakerKeyPath> [password]");
    console.log("  node depositStake.js <networkType> <govTokenAmountInWei> <validatorAddr> <wThetaCollateralAmountInWei> <tFuelFeeInWei> <stakerKeyPath> [password]");
    console.log("");
    process */
/*
let networkType = process.argv[2];
setCfg(networkType);

let password = DontCare;
let govTokenAmountInWei = DontCare;
let validatorAddr = DontCare;
let wThetaCollateralAmountInWei = DontCare;
let tFuelFeeInWei = DontCare;
let keyPath = DontCare;

if (process.argv.length == 6 || process.argv.length == 7) {
    govTokenAmountInWei = BigNumber.from(process.argv[3]);
    validatorAddr = process.argv[4];
    keyPath = process.argv[5];
    if (process.argv.length == 7) {
        password = process.argv[6];
    }
} else if (process.argv.length == 8 || process.argv.length == 9) {
    govTokenAmountInWei = BigNumber.from(process.argv[3]);
    validatorAddr = process.argv[4];
    wThetaCollateralAmountInWei = BigNumber.from(process.argv[5]);
    tFuelFeeInWei = BigNumber.from(process.argv[6]);
    keyStore = process.argv[7];
    if (process.argv.length == 9) {
        password = process.argv[8];
    }
}

stakeToSubchainValidator(govTokenAmountInWei, validatorAddr, wThetaCollateralAmountInWei, tFuelFeeInWei, keyStore, password)

stakeToSubchainValidator(amountInWei, validatorAddr, wThetaCollateralAmountInWei, tFuelFeeInWei, keyStore, password)
 */

module.exports = {
    stakeToSubchainValidator
};

