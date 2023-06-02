const {getDb} = require("../db/db");
//const {stakeToSubchainValidator} = require("../sdk/depositStake");
const {SORT_ORDER, NOW} = require("../constants");
const {stakeToSubchainValidator} = require("../sdk/depositStake");
const {BigNumber} = require("@ethersproject/bignumber");
const get = (req, res) => {
    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);
    const substakes_enabled = db.prepare(`SELECT * FROM substake WHERE ? = 1`).get('enable');
    const substakes_disabled = db.prepare(`SELECT * FROM substake WHERE ? = 0`).get('enable');
    //ORDER BY id ${SORT_ORDER};

    if (req.session.loggedin) {

        if (account_row) {

            const added = req.query.added === 'true';

            res.render('substake.html', { account: account_row, substakes_enabled, substakes_disabled, added:added});
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}

const substake_by_id = (req, res) => {

    const db = getDb();
    const substake_id = req.params.id;
    const substake = db.prepare(`SELECT * FROM substake WHERE id = ?`).get(substake_id);

    // parse 'keystore' and 'tags' fields
    if (substake) {
        console.log('oi!')
    }

    db.close();
    res.json(substake);
}


const add_get = (req, res) => {

    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    const keystoreTotalCountMainnet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.mainnet') = 1`).get().count;
    const keystoreTotalCountTestnet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.testnet') = 1`).get().count;
    const keystoreTotalCountPrivatenet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.privatenet') = 1`).get().count;

    if (req.session.loggedin) {

        if (account_row) {

            res.render('substake_add.html', { keystoreTotalCountPrivatenet, keystoreTotalCountTestnet, keystoreTotalCountMainnet });
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }
}

const add_post = async (req, res) => {

    //need to work on this

    const db = getDb();

    //const keystore_name = req.body.keystore_name;
    //const keystore_data = req.body.keystore_data;
    const enable = req.body.enable ? 1 : 0
    //const keystore_password = req.body.keystore_password;

    const name = req.body.substake_name;
    const mainchain = req.body.mainchain;
    const type = req.body.type;
    const subchain_id = req.body.subchain_id;
    const admin_keystore_id = req.body.admin_keystore_id;
    const validator_keystore_id = req.body.validator_keystore_id;

    const govtoken_id = req.body.govtoken_id;
    const govtoken_stake_wei = req.body.govtoken_stake + "000000000000000000";
    let wtheta_collateral_wei = '1000000000000000000000';
    let tfuel_fee_wei = '20000000000000000000000';

    if (type === "validator-stake-govonly") {

        wtheta_collateral_wei = '0';
        tfuel_fee_wei = '0';
    }

    try {

        await db.prepare(`INSERT INTO substake ("name", "mainchain", "type", "subchain_id", 
                                                    "admin_keystore_id", 
                                                    "validator_keystore_id", "govtoken_id", "govtoken_stake_wei", "wtheta_collateral_wei", "tfuel_fee_wei", "enable") 
                                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
                                                        name, mainchain, type, subchain_id,
                                                        admin_keystore_id, validator_keystore_id, govtoken_id, govtoken_stake_wei, wtheta_collateral_wei, tfuel_fee_wei, enable);

        res.redirect('/substake?added=true');
    } catch (err) {

       console.log('err:',err)
    }
}
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////


const edit_get = async (req, res) => {

    const id = req.params.id;
    const db = getDb();

    let substake = await db.prepare(`SELECT name, last_update, enable FROM substake WHERE id = ?`).get(id);
    let substake_name = substake.name;
    let enable = substake.enable;
    let enableStr = (enable == 1) ? "checked" : "";

    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    if (req.session.loggedin) {

        if (account_row) {

            res.render('substake_edit.html', { id, substake_name, enableStr });
        } else {

            res.render('/', { message: 'Login failed' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}


const edit_post = async (req, res) => {

    const id = req.params.id;
    const db = getDb();

    const substake_name = req.body.substake_name;
    const enable = req.body.enable ? 1 : 0;

    try {

        await db.prepare(`UPDATE substake SET name = ?, last_update = ?, enable = ? WHERE id = ?`).run(substake_name, NOW(), enable, id);

        res.redirect('/substake?edited=true');
    } catch (err) {

        console.log('err:',err)
    }
}

const enabled_substakes = (req, res) =>{

    const db = getDb();
    const enable = req.params.enable === 'enabled' ? 1 : 0;
    const substakes = db.prepare(`SELECT * FROM substake WHERE enable = ? ORDER BY id ${SORT_ORDER};`).all(enable);

    res.json(substakes);
}

///////////////////////

const deploy = async (req, res) => {

    //await auth();
    const db = getDb();
    const substake_id = req.params.id;

    const substake = db.prepare(`SELECT * FROM substake WHERE id = ?`).get(substake_id);
    const subchain = db.prepare(`SELECT * FROM subchain WHERE id = ?`).get(substake.subchain_id);
    const genesis = db.prepare(`SELECT * FROM genesis WHERE id = ?`).get(subchain.genesis_id);

    const subchainChainId = genesis.subchain_id;

    const validator_keystore_id = substake.validator_keystore_id;
    const validator_keystore = db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(validator_keystore_id);

    let validatorAddress = '';
    // parse 'keystore'
    if (validator_keystore) {

    //console.log('validator_keystore:',validator_keystore);
        validator_keystore.keystore = JSON.parse(validator_keystore.keystore);
        validatorAddress = validator_keystore.keystore.address;
    }

    //const genesis_id = substake.genesis_id;
    const govtoken_id = substake.govtoken_id;
   // const

    const admin_wallet_keystore_id = substake.admin_keystore_id;
    const admin_wallet_keystore = db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(admin_wallet_keystore_id);

    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    if (req.session.loggedin) {

        if (account_row) {

            // allow user to continue
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    let admin_wallet_address = '';

    // parse 'keystore'
    if (admin_wallet_keystore) {

        admin_wallet_keystore.keystore = JSON.parse(admin_wallet_keystore.keystore);
        admin_wallet_address = admin_wallet_keystore.keystore.address;
    }

    //const minterKeystore = admin_wallet_keystore.keystore;
    //const minterKeyPassword = admin_wallet_keystore.password; //'qwertyuiop';
   // let admin = admin_wallet_address;
    const mainchain = substake.mainchain;

    const keystore = db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(admin_wallet_keystore_id);
    const govtoken = db.prepare(`SELECT * FROM govtoken WHERE id = ?`).get(govtoken_id);

    let wallet = '';

    // parse 'keystore' and 'tags' fields
    if (keystore) {

        keystore.keystore = JSON.parse(keystore.keystore);
        keystore.tags = JSON.parse(keystore.tags);

    }

    const key = keystore.keystore;
    const password = keystore.password; //'qwertyuiop';

    const govTokenContractAddress = govtoken.address;

    const amountInWei = BigNumber.from(substake.govtoken_stake_wei);
    const wThetaCollateralAmountInWei = BigNumber.from(substake.wtheta_collateral_wei);
    const tFuelFeeInWei = BigNumber.from(substake.tfuel_fee_wei);


    //registersubstake(substake_id, mainchain, subchainChainId, govtoken_address, genesis_hash, key, password)
    // await stakeToSubchainValidator(substake_id, mainchain, subchainChainId, govTokenContractAddress, amountInWei, validatorAddr, wThetaCollateralAmountInWei, tFuelFeeInWei, Key, password)
    await stakeToSubchainValidator(substake_id, mainchain, subchainChainId, govTokenContractAddress, amountInWei, validatorAddress, wThetaCollateralAmountInWei, tFuelFeeInWei, key, password)
        .catch(error => {
            console.error('Error:', error);
            db.prepare('UPDATE substake SET last_state = ? WHERE id = ?').run(-1, substake_id);
        });

    db.close();

/////////////////////////////////

    // res.json(keystore);
    // node last_state from -1 to 0
    // start node
}


const status = async (req, res) => {

    const id = req.params.id;
    const db = getDb();

    try {
        const substake = db.prepare('SELECT * FROM substake WHERE id = ?').get(id);

        let current_status = "Initializing Validator Stake...";

        if (substake) {

            if (substake.last_state == 4) { current_status = "Connection established, standby..." }

            if (substake.last_state == 5) { current_status = "Depositing wTHETA Collateral..." }

            if (substake.last_state == 6) { current_status = "Approving GovToken Stake..." }

            if (substake.last_state == 7) { current_status = "Depositing GovToken Stake..." }

            if (substake.last_state == 8) { current_status = "Finalizing Configuration..." }

            if (substake.last_state == 9) { current_status = "Finalizing Configuration..." }

            //if (govtoken.last_state == 10) { current_status = "<br/>Complete" }

            res.json({ last_update: substake.last_update, last_state: substake.last_state, status: current_status });
        } else {
            res.status(404).json({ last_update: 0, status: "Substake not found" });
        }
    } catch (err) {
        console.error(err.message);
    }
};

module.exports = { get, add_get, add_post, edit_get, edit_post, enabled_substakes, substake_by_id, deploy, status };