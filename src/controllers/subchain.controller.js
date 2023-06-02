const {getDb} = require("../db/db");

const {NOW, auth, SORT_ORDER} = require("../constants");

const get = (req, res) => {
    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);
    const subchains_enabled = db.prepare(`SELECT * FROM subchain WHERE ? = 1`).get('enable');
    const subchains_disabled = db.prepare(`SELECT * FROM subchain WHERE ? = 0`).get('enable');

    //ORDER BY id ${SORT_ORDER};

    if (req.session.loggedin) {

        if (account_row) {

            const added = req.query.added === 'true';

            res.render('subchain.html', { account: account_row, subchains_enabled, subchains_disabled, added:added});
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}

const subchain_by_id = (req, res) => {

    const db = getDb();
    const subchain_id = req.params.id;
    const subchain = db.prepare(`SELECT * FROM subchain WHERE id = ?`).get(subchain_id);

    db.close();
    res.json(subchain);
}

const add_get = (req, res) => {

    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    const keystoreTotalCountMainnet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.mainnet') = 1`).get().count;
    const keystoreTotalCountTestnet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.testnet') = 1`).get().count;
    const keystoreTotalCountPrivatenet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.privatenet') = 1`).get().count;

    if (req.session.loggedin) {

        if (account_row) {

            res.render('subchain_add.html', { keystoreTotalCountMainnet,keystoreTotalCountTestnet,keystoreTotalCountPrivatenet });
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}

const add_post = async (req, res) => {

    const db = getDb();

    //const keystore_name = req.body.keystore_name;
    //const keystore_data = req.body.keystore_data;
    //const keystore_password = req.body.keystore_password;
    //const id = req.body.id ? parseInt(req.body.id) : 0;
    const subchain_name = req.body.subchain_name ? req.body.subchain_name : 'Example Privatenet Subchain';
    const mainchain = req.body.mainchain ? req.body.mainchain : 'privatenet';
    const genesis_id = req.body.genesis_id ? parseInt(req.body.genesis_id) : 1;
    const govtoken_id = req.body.govtoken_id ? parseInt(req.body.govtoken_id) : 1;
    const admin_keystore_id = req.body.admin_keystore_id ? parseInt(req.body.admin_keystore_id) : 1;
    const last_state = -1; //req.body.last_state ? parseInt(req.body.last_state) : -1;
    const last_update = NOW(); // = req.body.last_update ? req.body.last_update : '2020-01-01 00:00:01';
   // const enable = req.body.enable ? parseInt(req.body.enable) : 1;
    const enable = req.body.enable ? '1' : '0';
    //const tags_db = JSON.stringify(tags);

    try {
        await db.prepare(`INSERT INTO subchain ("subchain_name", "mainchain", "genesis_id", "govtoken_id", "admin_keystore_id", "last_state", "last_update", "enable") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(subchain_name, mainchain, genesis_id, govtoken_id, admin_keystore_id, last_state, last_update, enable);

        res.redirect('/subchain?added=true');
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

    let subchain = await db.prepare(`SELECT subchain_name, last_update, enable FROM subchain WHERE id = ?`).get(id);
    let subchain_name = subchain.subchain_name;
    let enable = subchain.enable;
    let enableStr = (enable == 1) ? "checked" : "";

    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    if (req.session.loggedin) {

        if (account_row) {

            res.render('subchain_edit.html', { id, subchain_name, enableStr });
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

    const subchain_name = req.body.subchain_name;
    const enable = req.body.enable ? 1 : 0;

    try {

        await db.prepare(`UPDATE subchain SET subchain_name = ?, last_update = ?, enable = ? WHERE id = ?`).run(subchain_name, NOW(), enable, id);

        res.redirect('/subchain?edited=true');
    } catch (err) {

        console.log('err:',err)
    }
}

const enabled_subchains = (req, res) =>{

    const db = getDb();
    const enable = req.params.enable === 'enabled' ? 1 : 0;
    const subchains = db.prepare(`SELECT * FROM subchain WHERE enable = ? ORDER BY id ${SORT_ORDER};`).all(enable);

    res.json(subchains);
}


const deploy = async (req, res) => {

    const db = getDb();
    await auth(db, req, res);

    const subchain_id = req.params.id;
    const subchain = await db.prepare(`SELECT * FROM subchain WHERE id = ?`).get(subchain_id);
    const genesis_id = subchain.genesis_id;
    const govtoken_id = subchain.govtoken_id;
    const admin_wallet_keystore_id = subchain.admin_keystore_id;
    const admin_wallet_keystore = await db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(admin_wallet_keystore_id);
    let admin_wallet_address = '';

    // parse 'keystore'
    if (admin_wallet_keystore) {

        admin_wallet_keystore.keystore = JSON.parse(admin_wallet_keystore.keystore);
        admin_wallet_address = admin_wallet_keystore.keystore.address;
    }

    const {registerSubchain} = require('../sdk/registerSubchain');
    //const minterKeystore = admin_wallet_keystore.keystore;
    //const minterKeyPassword = admin_wallet_keystore.password; //'qwertyuiop';
    let admin = admin_wallet_address;
    const mainchain = subchain.mainchain;
    //const admin_wallet = admin;  // the admin wallet and the admino_wallet do not have to be the same address but they are for now
    const keystore = await db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(admin_wallet_keystore_id);
    const genesis = await db.prepare(`SELECT * FROM genesis WHERE id = ?`).get(genesis_id);
    const govtoken = await db.prepare(`SELECT * FROM govtoken WHERE id = ?`).get(govtoken_id);

//    let wallet = '';

// parse 'keystore' and 'tags' fields
    if (keystore) {

        keystore.keystore = JSON.parse(keystore.keystore);
        keystore.tags = JSON.parse(keystore.tags);
    //    wallet = keystore.keystore.address;
    }

    const key = keystore.keystore;
    const password = keystore.password; //'qwertyuiop';
    const genesis_hash = genesis.genesis_blockhash;
    const subchainChainId = genesis.subchain_id;
    const govtoken_address = govtoken.address;

    const admin_mainchain_keystore_id = genesis.admin_mainchain_keystore_id;
    const initial_validator1_keystore_id = genesis.initial_validator1_keystore_id;
    const initial_validator1_govtoken_stake = genesis.initial_validator1_govtoken_stake;

    console.log('admin_wallet_address:', admin_wallet_address)
    //console.log('minterKeystore:', admin_wallet_keystore.keystore);
    //console.log('minterKeyPassword:', admin_wallet_keystore.password);
    console.log('subchain_id:', subchain_id);
    console.log('mainchain:',mainchain);
    //console.log('admin_wallet:',admin_wallet);
    console.log('admin:',admin);
    //console.log('minterKey:', minterKeystore);
    //console.log('minterKeyPassword:', minterKeyPassword);

    //console.log('key:', key);
    console.log('genesisHash:', genesis_hash);
    console.log('subchainChainId:', subchainChainId);
    //console.log('govtoken_id:',govtoken_id);
    console.log('govtoken wallet address :',govtoken.address);

    //admin = wallet;

    await registerSubchain(subchain_id, mainchain, subchainChainId, govtoken_address, genesis_hash, key, password)
        .catch(error => {
            console.error('Error:', error);
            db.prepare('UPDATE subchain SET last_state = ? WHERE id = ?').run(-1, subchain_id);
        });

    /*
    db.prepare(`CREATE TABLE IF NOT EXISTS substake (

  "name" TEXT NOT NULL DEFAULT 'Initial stake to Theta Mainnet for Subchain 12345',
  "mainchain" TEXT NOT NULL DEFAULT 'testnet',
  "type" TEXT NOT NULL DEFAULT 'stake',

)`).run();*/
/*





        "admin_keystore_id" INTEGER NOT NULL DEFAULT 1,
        "validator_keystore_id" INTEGER NOT NULL DEFAULT 2,
        "govtoken_id" INTEGER NOT NULL DEFAULT 1,
        "govtoken_stake_wei" TEXT NOT NULL DEFAULT '100000000000000000000000',
        "wtheta_collateral_wei" TEXT NOT NULL DEFAULT '10000000000000000000000',
        "tfuel_fee_wei" TEXT NOT NULL DEFAULT '20000000000000000000000',
        "govtoken_approve_tx_hash" TEXT NOT NULL DEFAULT '',
        "govtoken_stake_tx_hash" TEXT NOT NULL DEFAULT '',
        "wtheta_collateral_tx_hash" TEXT NOT NULL DEFAULT '',
        "tfuel_fee_in_wei_tx_hash" TEXT NOT NULL DEFAULT '',
        "vcm_address" TEXT NOT NULL DEFAULT '',
        "vsm_address" TEXT NOT NULL DEFAULT '',
        "validator_set" TEXT NOT NULL DEFAULT '[]',
        "dynasty" TEXT NOT NULL DEFAULT 'Pending Deployment',
        "next_validator_set" TEXT NOT NULL DEFAULT '[]',
        "next_dynasty" TEXT NOT NULL DEFAULT 'Pending Deployment',
        "last_state" INTEGER NOT NULL DEFAULT -1,
        "last_update" TEXT NOT NULL DEFAULT '2020-01-01 00:00:01',
        "enable" INTEGER NOT NULL DEFAULT 1
 */

    await db.prepare(`INSERT INTO substake ("name", "mainchain", "type", "subchain_id", "admin_keystore_id",
"validator_keystore_id", "govtoken_id", 
"govtoken_stake_wei", "wtheta_collateral_wei", "tfuel_fee_wei", 
 "dynasty", "last_state", "last_update" )
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(
            "AutoGen: Validator #1 Stake for Subchain #" + String(subchainChainId),
            "testnet", "validator-stake", subchain_id, admin_mainchain_keystore_id,
            initial_validator1_keystore_id, govtoken_id,
            initial_validator1_govtoken_stake, "1000000000000000000000", "20000000000000000000000",
            "", -1, NOW()
        );

    //await db.prepare(`INSERT INTO substake ("name", "mainchain", "type", "govtoken_wei_stake_amount", "wtheta_collateral_wei_stake_amount", "tfuel_fee_wei_stake_amount", "validator_keystore_id", "admin_keystore_id", "tx_hash", "dynasty", "last_state", "last_update", "enable")
    //VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run("Initial Validator #1 Stake for Subchain #"+String(subchainChainId), 'testnet', "stake", initial_validator1_govtoken_stake, '10000000000000000000000', '20000000000000000000000', initial_validator1_keystore_id, admin_mainchain_keystore_id, '', '', -1, NOW(), 1);

    // await db.prepare(`INSERT INTO substake ("name", "mainchain", "type", "govtoken_wei_stake_amount", "wtheta_collateral_wei_stake_amount", "tfuel_fee_wei_stake_amount", "validator_keystore_id", "admin_keystore_id", "tx_hash", "dynasty", "last_state", "last_update", "enable")
    //     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run("Initial Validator #1 Stake for Subchain #"+String(subchain_chain_id), 'testnet', "stake", initial_validator1_govtoken_stake, '10000000000000000000000', '20000000000000000000000', initial_validator1_keystore_id, admin_mainchain_keystore_id, '', '', -1, NOW(), 1);
    //
    db.close();
}


const status = async (req, res) => {

    const id = req.params.id;
    const db = getDb();

    try {
        const subchain = db.prepare('SELECT * FROM subchain WHERE id = ?').get(id);

        let current_status = "Processing...";

        if (subchain) {
            if (subchain.last_state >= 4 && subchain.last_state <= 5) { current_status = "Connection established, standby..." }

            if (subchain.last_state >= 6 && subchain.last_state <= 7) { current_status = "Forging subchain, please wait..." }

            if (subchain.last_state >= 8 && subchain.last_state <= 9) { current_status = "Finalizing subchain, please wait..." }

            res.json({ last_update: subchain.last_update, last_state: subchain.last_state, status: current_status });
        } else {
            res.status(404).json({ last_update: 0, status: "Subchain not found" });
        }
    } catch (err) {
        console.error(err.message);
    }
};

module.exports = { get, add_get, add_post, edit_get, edit_post, enabled_subchains, subchain_by_id, deploy, status };