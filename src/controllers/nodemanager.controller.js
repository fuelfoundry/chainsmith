const {getDb} = require("../db/db");
const {SubchainValidator} = require("../service/ssh/subchainValidator");
const {MainchainValidator} = require("../service/ssh/mainchainValidator");
const {testConnection} = require("../utils/testSsh");

const {SORT_ORDER, NOW, decrypt, encrypt} = require("../constants");

const get = (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);
    const nodes_enabled = db.prepare(`SELECT * FROM nodes WHERE ? = 1`).get('enable');
    const nodes_disabled = db.prepare(`SELECT * FROM nodes WHERE ? = 0`).get('enable');

    if (req.session.loggedin) {

        if (account_row) {

            res.render('nodemanager.html', { account: account_row, nodes_enabled, nodes_disabled});
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}


const node_by_id = (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const id = req.params.id;

    let node = db.prepare(`SELECT * FROM nodes WHERE id = ?`).get(id);

    if (node.password_encrypted === 1) {

        node.ssh_pass = decrypt(node.ssh_pass, req.session.password);
    }

    res.json(node);
    db.close();
}


const add_get = (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

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

            res.render('nodemanager_add.html', { local_user, local_hostname, local_os, keystoreTotalCountPrivatenet, keystoreTotalCountTestnet, keystoreTotalCountMainnet });
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }
}


const post = (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

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

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const name = req.body.node_name;
    const type = req.body.node_type;
    const mainchain = req.body.mainchain;
    const keystore_id = req.body.keystore_id;
    const genesis_id = req.body.genesis_id;
    const host = req.body.host;
    const is_local = req.body.is_local;
    const dir_root = require('os').homedir(); //req.body.dir_root;
    const deploy_from_source = 1; //req.body.deploy_from_source;
    const last_update = new Date().toISOString().replace('T', ' ').substring(0, 19); //req.body.last_update;
    const enable = req.body.enable ? 1 : 0;
    const ssh_user = req.body.ssh_user;
    let ssh_pass = req.body.ssh_pass;

    try {

        if (req.session.password_encryption === true) {

            ssh_pass = encrypt(ssh_pass, req.session.password);
            await db.prepare(`INSERT INTO nodes (name, type, mainchain, host, is_local, dir_root, deploy_from_source, keystore_id, genesis_id, ssh_user, ssh_pass, last_update, enable, password_encrypted) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, type, mainchain, host, is_local, dir_root, deploy_from_source, keystore_id, genesis_id, ssh_user, ssh_pass, last_update, enable, 1);
        } else {

            await db.prepare(`INSERT INTO nodes (name, type, mainchain, host, is_local, dir_root, deploy_from_source, keystore_id, genesis_id, ssh_user, ssh_pass, last_update, enable) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(name, type, mainchain, host, is_local, dir_root, deploy_from_source, keystore_id, genesis_id, ssh_user, ssh_pass, last_update, enable);
        }


        //const context = { added: true };
        res.redirect('/nodemanager?added=true');
    } catch (err) {
        console.log(err)
        // error handling pending ...
    }
}


const edit_get = async (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const id = req.params.id;
    const db = getDb();

    const keystoreTotalCountMainnet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.mainnet') = 1`).get().count;
    const keystoreTotalCountTestnet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.testnet') = 1`).get().count;
    const keystoreTotalCountPrivatenet = getDb().prepare(`SELECT COUNT(*) as count FROM keyvault WHERE JSON_EXTRACT(tags, '$.privatenet') = 1`).get().count;

    let node = await db.prepare(`SELECT name, type, host, ssh_user, ssh_pass, keystore_id, genesis_id, mainchain, last_state, last_update, enable FROM nodes WHERE id = ?`).get(id);

    const name = node.name;
    const type = node.type;
    const host = node.host;
    const ssh_user = node.ssh_user;
    const ssh_pass = node.ssh_pass;
    const keystore_id = node.keystore_id;
    const genesis_id = node.genesis_id;
    const mainchain = node.mainchain;
    const last_update = node.last_update;
    const enable = node.enable;

    let last_state = node.last_state;

    let keystore = await db.prepare(`SELECT keystore FROM keyvault WHERE id = ?`).get(keystore_id);

    if (keystore) {

        keystore = JSON.parse(keystore.keystore);
    }

    const keystore_address = keystore.address;

    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    if (req.session.loggedin) {

        if (account_row) {

            const enableStr = (enable == 1) ? "checked" : "";

            res.render('nodemanager_edit.html', { keystore_address, keystoreTotalCountMainnet, keystoreTotalCountTestnet, keystoreTotalCountPrivatenet, id, name, type, host, ssh_user, ssh_pass, keystore_id, genesis_id, mainchain, last_state, last_update, enableStr });
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}


const edit_post = async (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const id = req.params.id;
    const db = getDb();
    const name = req.body.node_name;
    const type = req.body.node_type;
    const mainchain = req.body.mainchain;
    const keystore_id = req.body.keystore_id;
    const genesis_id = req.body.genesis_id;
    const host = req.body.host;
    const ssh_user = req.body.ssh_user;
    const last_state = req.body.last_state;
    const enable = req.body.enable ? 1 : 0;
    let ssh_pass = req.body.ssh_pass;

    try {

            if (ssh_pass.length > 0) {

                if (req.session.password_encryption === true) {

                    ssh_pass = encrypt(ssh_pass, req.session.password);

                    await db.prepare(`UPDATE nodes SET name = ?, type = ?, mainchain = ?, host = ?, keystore_id = ?, genesis_id = ?, ssh_user = ?, ssh_pass = ?, last_state = ?, last_update = ?, enable = ?, password_encrypted = ? WHERE id = ?`).run(name, type, mainchain, host, keystore_id, genesis_id, ssh_user, ssh_pass, last_state, NOW(), enable, 1, id);
                } else {

                    await db.prepare(`UPDATE nodes SET name = ?, type = ?, mainchain = ?, host = ?, keystore_id = ?, genesis_id = ?, ssh_user = ?, ssh_pass = ?, last_state = ?, last_update = ?, enable = ? WHERE id = ?`).run(name, type, mainchain, host, keystore_id, genesis_id, ssh_user, ssh_pass, last_state, NOW(), enable, id);
                }

            } else {

                await db.prepare(`UPDATE nodes SET name = ?, type = ?, mainchain = ?, host = ?, keystore_id = ?, genesis_id = ?, ssh_user = ?, last_state = ?, last_update = ?, enable = ? WHERE id = ?`).run(name, type, mainchain, host, keystore_id, genesis_id, ssh_user, last_state, NOW(), enable, id);
            }

        res.redirect('/nodemanager?edited=true');
    } catch (err) {

        console.log(err);
        res.redirect('/nodemanager?edited=false');
    }
}


const enabled_nodes = (req, res) =>{

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const enable = req.params.enable === 'enabled' ? 1 : 0;
    const nodes = db.prepare(`SELECT * FROM nodes WHERE enable = ? ORDER BY id ${SORT_ORDER};`).all(enable);

    res.json(nodes);
}


// for joes
const deploy = async (req, res) => {

    const id = req.params.id;
    const db = getDb();

    const node = db.prepare(`SELECT * FROM nodes WHERE id = ?`).get(id);

    db.prepare('UPDATE nodes SET last_state = ? WHERE id = ?').run(1, id);

    const username = node.ssh_user;
    const host = node.host;

    let password = node.ssh_pass;


    if (node.password_encrypted == 1) {
        password = decrypt(password, req.session.password) //    node.ssh_pass = decrypt(node.ssh_pass, req.session.password);
        node.decryptkey = req.session.password;
    }

    const isWorking = await testConnection({username, password, host});

    node.ssh_pass = password;

    console.log('isWorking:', isWorking)
    if (isWorking) {

        db.prepare('UPDATE nodes SET last_state = ? WHERE id = ?').run(3, id);
       
    } else {

        node.last_state = 2;
        db.prepare('UPDATE nodes SET last_state = ? WHERE id = ?').run(2, id);
        db.close();
        return;
    }

    db.close();
    // node last_state from -1 to 0

    // start node
    console.log('-:');
    // Parse 'keystore' and 'tags' fields

    if (node.type === 1) {
        const mainnetValidator = new MainchainValidator(node);
        mainnetValidator.install()
    } else if (node.type === 2) {

        const subchain = new SubchainValidator(node)
        subchain.install()
    }


    // const sub = new Subchain(node);
    //
    // sub.install().then(response=> {
    //     if(response === true) {
    //         console.log('returning')
    //         res.send('hello world')
    //     }
    // })
}

const test_ssh = async (req, res) => {
    const {username, password, host} = req.body;
    const isWorking = await testConnection({username, password, host});
    if (isWorking) {
        res.json({working: true})
    } else {
        res.json({working: false});
    }

}


const start = (req, res) =>{


    // node last_state = 5
}


const stop = (req, res) =>{

    // node last_state = 0
}


const reset = (req, res) =>{

    // stop node

    // (re-)deploy node
}


const status = async (req, res) => {

    const id = req.params.id;
    const db = getDb();

    try {
        const node = db.prepare('SELECT * FROM nodes WHERE id = ?').get(id);

        let current_status = "Not deployed";

        // verify ssh user
        //
        //const {username, password, host} = req.body;

        //const username = node.ssh_user;
        //const password = node.ssh_pass;
        //const host = node.host;

        //const isWorking = await testConnection({username, password, host});
        //if (isWorking) {
        //    node.last_state = 10;
        //} else {
        //    node.last_state = 2;
        //}

        if (node) {

            if (node.last_state == 2) { current_status = "Cannot SSH to host: " + host }

            if (node.last_state == 3) { current_status = "Downloading Golang from Google..." }

            if (node.last_state == 4) { current_status = "Installing Golang..." }

            if (node.last_state == 5) { current_status = "Downloading Node Source From Theta Github..." }

            if (node.last_state == 6) { current_status = "Compiling Node Source..." }

            if (node.last_state == 7) { current_status = "Downloading Mainchain Snapshot..." }

            if (node.last_state == 8) { current_status = "Launching Node..." }

            if (node.last_state == 9) { current_status = "NODE SYNC" }

            if (node.last_state == 10) { current_status = "CONFIGURATION HEALTHY" }

            res.json({ last_update: NOW(), last_state: node.last_state, status: current_status });
        } else {
            res.status(404).json({ last_update: 0, last_state: node.last_state, status: "Node not found" });
        }
    } catch (err) {
        console.error(err.message);
    }
};
    // if syncing = true then set last_state = 9
    // if syncing = false then node last_state = 10


module.exports = { get, post, add_get, add_post, edit_get, edit_post, enabled_nodes, node_by_id, deploy, start, stop, reset, status, test_ssh };
