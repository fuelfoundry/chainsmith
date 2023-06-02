
require('isomorphic-fetch');
const axios = require('axios');
const {getDb} = require("../db/db");
const {SORT_ORDER, NOW} = require("../constants");

const get = (req, res) => {

    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);
    const enabled = db.prepare(`SELECT * FROM genesis WHERE ? = 1`).get('enable');
    const disabled = db.prepare(`SELECT * FROM genesis WHERE ? = 0`).get('enable');

    if (req.session.loggedin) {

        if (account_row) {

            const added = req.query.added === 'true';

            res.render('genesisforge.html', { account: account_row, enabled, disabled, added});
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

    if (req.session.loggedin) {

        if (account_row) {

            res.render('genesisforge_add.html', { local_user, local_hostname, local_os, keystoreTotalCountPrivatenet, keystoreTotalCountTestnet, keystoreTotalCountMainnet });
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
    const name = req.body.genesis_name;
    const mainchain = req.body.mainchain;
    //const subchain_name = req.body.subchain_name;
    const subchain_id = req.body.subchain_id;
    const admin_mainchain_keystore_id = req.body.admin_mainchain_keystore_id;
    const fallback_receiver_keystore_id =  req.body.fallback_receiver_keystore_id;
    const initial_validator1_keystore_id = req.body.initial_validator1_keystore_id;
    const initial_validator1_govtoken_stake = req.body.initial_validator1_govtoken_stake +'000000000000000000';
    const enable = req.body.enable ? 1 : 0;
    const validator1_keystore_response = await db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(initial_validator1_keystore_id);
    const validator1_keystore_json = JSON.parse(validator1_keystore_response.keystore);
    const initial_validator1_address = validator1_keystore_json.address;
    const init_validator_json = '[{"address": "'+initial_validator1_address+'","stake": "'+initial_validator1_govtoken_stake+'000000000000000000"}]';

    const admin_mainchain_keystore_response = await db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(admin_mainchain_keystore_id);
    const admin_mainchain_keystore_json = JSON.parse(admin_mainchain_keystore_response.keystore);

    const cross_chain_fee_setter = admin_mainchain_keystore_json.address;

    let chain_registrar = req.body.chain_registrar;
    let tfuel_token_bank = req.body.tfuel_token_bank;
    let tnt20_token_bank = req.body.tnt20_token_bank;
    let tnt721_token_bank = req.body.tnt721_token_bank;
    let tnt1155_token_bank = req.body.tnt1155_token_bank;
    let balance_checker = req.body.balance_checker;
    let genesis_blockhash = req.body.genesis_blockhash;

    const auto_genesis = req.body.auto_genesis;

    const admin_mainchain_address = admin_mainchain_keystore_json.address; //admin_mainchain_keystore_id;
    const fallback_receiver_keystore_response = await db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(fallback_receiver_keystore_id);
    const fallback_receiver_keystore_json = JSON.parse(fallback_receiver_keystore_response.keystore);
    const fallback_receiver_address = fallback_receiver_keystore_json.address;

    let snapshotBinary = null;
    let snapshotBuffer = null;

    let last_state = -1;

    if (auto_genesis == 0) {

        last_state = 10;
    }

    if (auto_genesis == 1) {
        console.log('::auto-genesis::')
        last_state = 5;

        const url = `https://chainsmith.fuelfoundry.net/dynamic/?mainchainID=${mainchain}&subchainID=${subchain_id}&admin=${admin_mainchain_address}&fallbackReceiver=${fallback_receiver_address}&initial_validator1_address=${initial_validator1_address}&initial_validator1_govtoken_stake=${initial_validator1_govtoken_stake}`;

        await fetch(url)
            .then(response => response.json())
            .then(data => {
                // Handle the response data

                chain_registrar = data.chain_registrar;
                tfuel_token_bank = data.tfuel_token_bank;
                tnt20_token_bank = data.tnt20_token_bank;
                tnt721_token_bank = data.tnt721_token_bank;
                tnt1155_token_bank = data.tnt1155_token_bank;
                balance_checker = data.balance_checker;
                genesis_blockhash = data.genesis_blockhash;
                //console.log(data);
            })
            .catch(error => {
                // Handle the error
                console.error(error);
            });

        last_state = 9;
        const url_snapshot = 'https://chainsmith.fuelfoundry.net/dynamic/' + genesis_blockhash;
        const response = await fetch(url_snapshot);
        snapshotBinary = await response.arrayBuffer();
        snapshotBuffer = Buffer.from(snapshotBinary);

        // https://chainsmith.fuelfoundry.net/dynamic/?mainchainID=privatenet&subchainID=360777&admin=0x2E833968E5bB786Ae419c4d13189fB081Cc43bab&fallbackReceiver=0x2E833968E5bB786Ae419c4d13189fB081Cc43bab&initial_validator1_address=0x1234567890abcdef&initial_validator1_govtoken_stake=100000000000000000000000
        // fetch genesis from FF servers
        last_state = 10;
    }

    try {

        const now = new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '');
        await db.prepare(`INSERT INTO genesis (name, mainchain, subchain_id, init_validator_json, initial_validator1_keystore_id, initial_validator1_govtoken_stake, admin_mainchain_keystore_id, fallback_receiver_keystore_id, cross_chain_fee_setter, chain_registrar, tfuel_token_bank, tnt20_token_bank, tnt721_token_bank, tnt1155_token_bank, balance_checker, genesis_blockhash, snapshot, last_state, last_update, enable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, mainchain, subchain_id, init_validator_json, initial_validator1_keystore_id, initial_validator1_govtoken_stake, admin_mainchain_keystore_id, fallback_receiver_keystore_id, cross_chain_fee_setter, chain_registrar, tfuel_token_bank, tnt20_token_bank, tnt721_token_bank, tnt1155_token_bank, balance_checker, genesis_blockhash, snapshotBuffer, last_state, now, enable);

        res.redirect('/genesisforge?added=true');
    } catch (err) {

        console.log('err:',err);
    }
}
///////////////////////////////////////

const upload_get = async (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const id = req.params.id;
    const db = getDb();

    // change vars
    //
    let genesis = await db.prepare("SELECT name, subchain_id, cross_chain_fee_setter, chain_registrar, tfuel_token_bank, tnt20_token_bank, tnt721_token_bank, tnt1155_token_bank, balance_checker, genesis_blockhash, snapshot, port, min_block_interval, update_interval, last_state, last_update, enable FROM genesis WHERE id = ?").get(id);

    let genesis_name = genesis.name;
    let subchain_id = genesis.subchain_id;

    let snapshot = genesis.snapshot;

    let last_state = genesis.last_state;
    let last_update = genesis.last_update;

    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    if (req.session.loggedin) {

        if (account_row) {

            res.render('genesisforge_upload.html', { id, genesis_name, subchain_id, snapshot, last_state, last_update });
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}

const upload_post = async (req, res) => {

    const id = req.params.id;
    const db = getDb();

    //let snapshot = req.body.snapshot;

    const last_state = 10;

    try {

        // Convert base64 string back to binary data
        const fileData = Buffer.from(req.body.snapshot_data, 'base64');

        const stmt = db.prepare('UPDATE genesis SET snapshot = ? WHERE id = ?');
        stmt.run(fileData, id);

        res.redirect('/genesisforge/edit/'+id+'?snapup=true');
    } catch (err) {
        console.error(err);
        res.sendStatus(500);
    }
}


const edit_get = async (req, res) => {

    const id = req.params.id;
    const db = getDb();
    const snapup = req.query.snapup === 'true';

    // change vars
    //
    let genesis = await db.prepare("SELECT name, subchain_id, cross_chain_fee_setter, chain_registrar, tfuel_token_bank, tnt20_token_bank, tnt721_token_bank, tnt1155_token_bank, balance_checker, genesis_blockhash, snapshot, port, min_block_interval, update_interval, last_state, last_update, enable FROM genesis WHERE id = ?").get(id);

    let genesis_name = genesis.name;
    let subchain_id = genesis.subchain_id;
    let cross_chain_fee_setter = genesis.cross_chain_fee_setter;
    let chain_registrar = genesis.chain_registrar;
    let tfuel_token_bank = genesis.tfuel_token_bank;
    let tnt20_token_bank = genesis.tnt20_token_bank;
    let tnt721_token_bank = genesis.tnt721_token_bank;
    let tnt1155_token_bank = genesis.tnt1155_token_bank;
    let balance_checker = genesis.balance_checker;
    let genesis_blockhash = genesis.genesis_blockhash;
    let snapshot = genesis.snapshot;
    let port = genesis.port;
    let min_block_interval = genesis.min_block_interval;
    let update_interval = genesis.update_interval;
    let last_state = genesis.last_state;
    let last_update = genesis.last_update;
    let enable = genesis.enable;
    let enableStr = (enable == 1) ? "checked" : "";

    if (snapshot === null) {
        last_state = 9;
    }

    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    if (req.session.loggedin) {

        if (account_row) {

            res.render('genesisforge_edit.html', { snapup, id, genesis_name, subchain_id, cross_chain_fee_setter, chain_registrar, tfuel_token_bank, tnt20_token_bank, tnt721_token_bank, tnt1155_token_bank, balance_checker, genesis_blockhash, snapshot, port, min_block_interval, update_interval, last_state, last_update, enableStr });
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}

const edit_post = async (req, res) => {

    const id = req.params.id;
    const db = getDb();
    let genesis_name = req.body.genesis_name;
    let chain_registrar = req.body.chain_registrar;
    let tfuel_token_bank = req.body.tfuel_token_bank;
    let tnt20_token_bank = req.body.tnt20_token_bank;
    let tnt721_token_bank = req.body.tnt721_token_bank;
    let tnt1155_token_bank = req.body.tnt1155_token_bank;
    let balance_checker = req.body.balance_checker;
    let genesis_blockhash = req.body.genesis_blockhash;
    //let min_block_interval = req.body.min_block_interval; -- future
    //let update_interval = req.body.update_interval; -- future
    const enable = req.body.enable ? 1 : 0

    const last_state = 10;
    try {

        /*
        -- future: add support for dynamic block interval adjustment

        await db.prepare(`UPDATE genesis SET name = ?, chain_registrar = ?, tfuel_token_bank = ?, tnt20_token_bank = ?, tnt721_token_bank = ?, tnt1155_token_bank = ?, 
            balance_checker = ?, genesis_blockhash = ?, min_block_interval = ?, update_interval = ?, last_state = ?, last_update = ?, enable = ? WHERE id = ?`).run(genesis_name,
            chain_registrar, tfuel_token_bank, tnt20_token_bank, tnt721_token_bank, tnt1155_token_bank, balance_checker, genesis_blockhash, min_block_interval, update_interval, last_state, NOW(), enable, id);
        */

        await db.prepare(`UPDATE genesis SET name = ?, chain_registrar = ?, tfuel_token_bank = ?, tnt20_token_bank = ?, tnt721_token_bank = ?, tnt1155_token_bank = ?, 
            balance_checker = ?, genesis_blockhash = ?, last_state = ?, last_update = ?, enable = ? WHERE id = ?`).run(genesis_name,
            chain_registrar, tfuel_token_bank, tnt20_token_bank, tnt721_token_bank, tnt1155_token_bank, balance_checker, genesis_blockhash, last_state, NOW(), enable, id);

        res.redirect('/genesisforge?edited=true');
    } catch (err) {

        console.log('err:',err)
    }
}

const genesis_by_id = (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const id = req.params.id;
    const genesis = db.prepare(`SELECT * FROM genesis WHERE id = ?`).get(id);

    if (genesis.init_validator_json) {

        genesis.init_validator_json = JSON.parse(genesis.init_validator_json);
    }

    res.json(genesis);
    db.close();
}


const enabled_profiles = (req, res) =>{

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const enable = req.params.enable === 'enabled' ? 1 : 0;
    const nodes = db.prepare(`SELECT * FROM genesis WHERE enable = ? ORDER BY id ${SORT_ORDER};`).all(enable);

    res.json(nodes);
}

function downloadBinaryData(binaryData, fileName) {

    // Create a Blob object from the binary data
    const blob = new Blob([binaryData]);

    // Create a temporary link element
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;

    // Programmatically click the link to start the download
    link.click();

    // Clean up the temporary link
    URL.revokeObjectURL(link.href);
}

const download_snapshot = async (req, res) =>{

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const id = req.params.id;
    const snapshotBinary = db.prepare(`SELECT snapshot FROM genesis WHERE id = ?`).get(id);

    // last_state //

    // check if result not null and contains snapshot
    if (snapshotBinary && snapshotBinary.snapshot) {

        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', `attachment; filename=snapshot`);

        // write binary data to response
        res.send(snapshotBinary.snapshot);
    } else {

        res.status(404).send('Snapshot not found for the specified genesis.');
    }
 //   }
}
//http://localhost:3000/genesisforge/id/3

const download_config = async (req, res) =>{

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const id = req.params.id;
    console.log('genesisforge id', id);
    console.log('--------------------');
    // Get the JSON from the first API
    const response = await axios.get(`http://localhost:3000/genesisforge/id/${id}`);
    const data = response.data;

    // Filter the data to only include certain variables
    const keys = ["mainchain","subchain_id","cross_chain_fee_setter","chain_registrar","tfuel_token_bank","tnt20_token_bank","tnt721_token_bank","tnt1155_token_bank","balance_checker","genesis_blockhash", "port", "min_block_interval","update_interval"];
    const filteredData = keys.reduce((obj, key) => {
        if(key in data) {
            obj[key] = data[key];
        }
        return obj;
    }, {});

    // Create the URL for the second API
    const url = new URL('https://chainsmith.fuelfoundry.io/static/theta-0.0.0.0/subchain-validator-config.yaml/');
    for (let key in filteredData) {
        url.searchParams.append(key, filteredData[key]);
    }
    console.log('url:', url);
    // Request the YAML file from the second API
    const fileResponse = await axios({
        url: url.toString(),
        method: 'GET',
        responseType: 'stream',
    });

    // Set headers for file download
    res.setHeader('Content-Type', 'application/x-yaml');
    res.setHeader('Content-Disposition', 'attachment; filename=config.yaml');

    // Pipe the stream directly to the user
    fileResponse.data.pipe(res);
}

// for joes
const deploy = (req, res) =>{

    // updates genesis by id

    // node last_state from -1 to 0

    // upon success last_update = 10
}

const reset = (req, res) =>{

    // generates new genesis, overwritting old one
    // stop node

    // (re-)deploy node
}

const status = (req, res) =>{

    // if syncing = false then node last_state = 10
}

module.exports = { get, post, add_get, add_post, upload_get, upload_post, edit_get, edit_post, enabled_profiles, genesis_by_id, download_snapshot, download_config, deploy, reset, status };