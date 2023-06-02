const {getDb} = require("../db/db");
const {auth, SORT_ORDER, forgeTokenNames, forgeTokenSymbols, getRandomIndex, NOW} = require('../constants');
const {mintMockWrappedThetaOnMainchain} = require("../sdk/mintMockWrappedTheta");
const get = (req, res) => {

    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);
    const enabled = db.prepare(`SELECT * FROM govtoken WHERE ? = 1`).get('enable');
    const disabled = db.prepare(`SELECT * FROM govtoken WHERE ? = 0`).get('enable');

    if (req.session.loggedin) {

        if (account_row) {

            const added = req.query.added === 'true';

            res.render('govtoken.html', { account: account_row, enabled, disabled, added});
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}

const add_get = (req, res) => {

    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);
    const local_user = require('os').userInfo().username;
    const local_hostname = require('os').hostname();
    const local_os = require('os').type();
    const keystoreTotalCountMainnet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.mainnet') = 1`).get().count;
    const keystoreTotalCountTestnet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.testnet') = 1`).get().count;
    const keystoreTotalCountPrivatenet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.privatenet') = 1`).get().count;

    const tempTokenIndex = getRandomIndex(forgeTokenNames.length);
    const forgeTokenNameHint = forgeTokenNames[tempTokenIndex];
    const forgeTokenNameSymbol = forgeTokenSymbols[tempTokenIndex];

    console.log("local_user:",local_user)

    if (req.session.loggedin) {

        if (account_row) {

            res.render('govtoken_add.html', { local_user, local_hostname, local_os, keystoreTotalCountPrivatenet, keystoreTotalCountTestnet, keystoreTotalCountMainnet, forgeTokenNameHint, forgeTokenNameSymbol });
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }
}

const post = (req, res) => {

    const username = req.body.username;
    const password = req.body.password;

    if (username && password) {

        const db = getDb();
        const row = db.prepare('SELECT * FROM accounts WHERE username = ? AND password = ?').get(username, password);

        if (row) {

            req.session.loggedin = true;
            req.session.username = username;

            res.redirect('/portal');
        } else {

            res.render('index.html', { msg: 'Incorrect Username or Password.' });
        }

        db.close();
    } else {

        res.render('index.html', { msg: 'Incorrect Username and Password.' });
    }
}


const add_post = async (req, res) => {

    const db = getDb();
    const name = req.body.govtoken_name;
    const symbol = req.body.govtoken_symbol;
    const address = req.body.govtoken_address;
    let mainchain = req.body.mainchain;
    let init_distr_wallet_keystore_id = req.body.init_distr_wallet_keystore_id;
    const enable = req.body.enable ? 1 : 0;
    let subchain_governance_token_json = req.body.subchain_governance_token_json;

    const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
    const mint_token = req.body.mint_token;
    const staker_reward_per_block = req.body.staker_reward_per_block;

    if (mainchain.length < 5) {
        mainchain = "testnet";
    }

    // update add't correction to find first avail key...
    //
    if (init_distr_wallet_keystore_id == 0) {
        init_distr_wallet_keystore_id = 1;
    }

    //INSERT INTO govtoken (name, address, staker_reward_per_block, mainchain, init_distr_wallet_keystore_id, enable) VALUES ('gdgdf', '', NULL, 'privatenet', '1', 1.0)
    //err: SqliteError: NOT NULL constraint failed: govtoken.staker_reward_per_block

    try {

        if (mint_token == 0) {

            await db.prepare(`INSERT INTO govtoken (name, symbol, address, staker_reward_per_block, mainchain, init_distr_wallet_keystore_id, last_state, last_update, enable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, symbol, address, staker_reward_per_block, mainchain, init_distr_wallet_keystore_id, 10, now, enable);
        } else {

            console.log('subchain_governance_token_json(p1):', subchain_governance_token_json)

            if (mint_token == 2) {

                subchain_governance_token_json = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../contracts/SubchainGovernanceToken.json'), 'utf8'));
            }
            console.log('subchain_governance_token_json(p2):', subchain_governance_token_json)
            console.log('name:      ', name);
            console.log('symbol:    ', symbol);
            console.log('address:   ', address);
            console.log('staker_reward_per_block: ', staker_reward_per_block);
            console.log('mainchain: ', mainchain);

            const subchain_governance_token_json_string = JSON.stringify(subchain_governance_token_json);
            await db.prepare(`INSERT INTO govtoken (name, symbol, address, staker_reward_per_block, mainchain, subchain_governance_token_json, init_distr_wallet_keystore_id, last_state, last_update, enable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, symbol, address, staker_reward_per_block, mainchain, subchain_governance_token_json_string, init_distr_wallet_keystore_id, -1, now, enable);        }

        res.redirect('/govtoken?added=true');
    } catch (err) {

        console.log('err:',err);
    }
    console.log('enable:',enable);
}


const edit_get = async (req, res) => {

    const id = req.params.id;
    const db = getDb();

    let govtoken = await db.prepare(`SELECT name, last_update, enable FROM govtoken WHERE id = ?`).get(id);
    let govtoken_name = govtoken.name;
    let enable = govtoken.enable;
    let enableStr = (enable == 1) ? "checked" : "";

    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    if (req.session.loggedin) {

        if (account_row) {

            res.render('govtoken_edit.html', { id, govtoken_name, enableStr });
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

    //const govtoken_name = req.body.govtoken_name;
    const enable = req.body.enable ? 1 : 0;

    try {

        await db.prepare(`UPDATE govtoken SET last_update = ?, enable = ? WHERE id = ?`).run(NOW(), enable, id);

        res.redirect('/govtoken?edited=true');
    } catch (err) {

        console.log('err:',err)
    }
}

const govtoken_by_id = (req, res) => {

    const db = getDb();
    const id = req.params.id;
    const govtoken = db.prepare(`SELECT * FROM govtoken WHERE id = ?`).get(id);

    // add't cleanup here
    //
    if (res.govtoken) {

        res.govtoken = JSON.parse(res.govtoken);
    }
    if (res.tags) {

        res.tags = JSON.parse(res.tags);
    }

    db.close();
    res.json(govtoken);
}


const enabled_govtokens = (req, res) =>{

    const db = getDb();
    const enable = req.params.enable === 'enabled' ? 1 : 0;
    const nodes = db.prepare(`SELECT * FROM govtoken WHERE enable = ? ORDER BY id ${SORT_ORDER};`).all(enable);

    res.json(nodes);
}


// for joes
const deploy = async (req, res) => {

    //await auth();
    const db = getDb();

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

    const govtoken_id = req.params.id;
    const govtoken = db.prepare(`SELECT * FROM govtoken WHERE id = ?`).get(govtoken_id);
    const init_distr_wallet_keystore_id = govtoken.init_distr_wallet_keystore_id; //req.params.id;
    const init_distr_wallet_keystore = db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(init_distr_wallet_keystore_id);
    let init_distr_wallet_address = '';

    // parse 'keystore'
    if (init_distr_wallet_keystore) {

        init_distr_wallet_keystore.keystore = JSON.parse(init_distr_wallet_keystore.keystore);
        init_distr_wallet_address = init_distr_wallet_keystore.keystore.address;
    }

    const {deploySubchainGovernanceToken} = require('../sdk/deployGovToken');
    const minterKeystore = init_distr_wallet_keystore.keystore;
    const minterKeyPassword = init_distr_wallet_keystore.password;
    const admin = init_distr_wallet_address; // same as init_distr_wallet for now
    const mainchain = govtoken.mainchain;
    const token_name = govtoken.name;
    const token_symbol = govtoken.symbol;
    const init_distr_wallet = init_distr_wallet_address;  // the admin wallet and the init_distro_wallet do not have to be the same address but they are for now


    try {
        await deploySubchainGovernanceToken(govtoken_id, mainchain, token_name, token_symbol, init_distr_wallet_keystore_id, init_distr_wallet, admin, minterKeystore, minterKeyPassword);
    } catch (error) {
        console.error('MintError:', error);


        const errorStr = error.toString();

        // There was an issue, reset deployment
        if (errorStr.includes("password") || errorStr.includes("invalid JSON wallet")) {

            console.error('init_distr_wallet_keystore_id:', init_distr_wallet_keystore_id);
            db.prepare('UPDATE keyvault SET last_state = ? WHERE id = ?').run(-2, init_distr_wallet_keystore_id);
        }

        db.prepare('UPDATE govtoken SET last_state = ? WHERE id = ?').run(-1, govtoken_id);
    }

    //  res.json(keystore);

    // node last_state from -1 to 0

    // start node
    db.close();
}

const reset = (req, res) =>{

    // stop node
    // (re-)deploy node
}

const status = async (req, res) => {

    const id = req.params.id;
    const db = getDb();

    try {
        const govtoken = db.prepare('SELECT * FROM govtoken WHERE id = ?').get(id);

        let current_status = "Processing...";

        if (govtoken) {
            if (govtoken.last_state == 5) { current_status = "Forging Governance Token..." }

            if (govtoken.last_state == 7) { current_status = "Finalizing mint... please wait..." }

            //if (govtoken.last_state == 10) { current_status = "<br/>Complete" }

            res.json({ last_update: govtoken.last_update, last_state: govtoken.last_state, status: current_status });
        } else {
            res.status(404).json({ last_update: 0, status: "Govtoken not found" });
        }
    } catch (err) {
        console.error(err.message);
    }
};

module.exports = { get, post, add_get, add_post, edit_get, edit_post, enabled_govtokens, govtoken_by_id, deploy, reset, status };
