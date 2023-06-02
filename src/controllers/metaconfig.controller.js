const {getDb} = require("../db/db");
const {SORT_ORDER} = require("../constants");

const get = (req, res) => {

    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);
    const enabled = db.prepare(`SELECT * FROM metaconfigs WHERE ? = 1`).get('enable');
    const disabled = db.prepare(`SELECT * FROM metaconfigs WHERE ? = 0`).get('enable');

    if (req.session.loggedin) {

        if (account_row) {

            res.render('metaconfig.html', { account: account_row, enabled, disabled});
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

            res.render('metaconfig_add.html', { local_user, local_hostname, local_os, keystoreTotalCountPrivatenet, keystoreTotalCountTestnet, keystoreTotalCountMainnet });
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
    const name = req.body.metaconfig_name;
    const address = req.body.metaconfig_address;
    const staker_reward_per_block = req.body.staker_reward_per_block;
    const mainchain = req.body.mainchain;
    const init_distr_wallet_keystore_id = req.body.init_distr_wallet_keystore_id;
    const enable = req.body.enable ? 1 : 0;

    try {

        await db.prepare(`INSERT INTO metaconfig (name, address, staker_reward_per_block, mainchain, init_distr_wallet_keystore_id, enable) VALUES (?, ?, ?, ?, ?, ?)`).run(name, address, staker_reward_per_block, mainchain, init_distr_wallet_keystore_id, enable);

        res.redirect('/metaconfig?added=true');
    } catch (err) {

        console.log('err:',err);
    }

    console.log('enable:',enable);
}


const enabled_configurations = (req, res) =>{

    const db = getDb();
    const enable = req.params.enable === 'enabled' ? 1 : 0;
    const nodes = db.prepare(`SELECT * FROM metaconfigs WHERE enable = ?`).all(enable);

    res.json(nodes);
}


const config_by_id = (req, res) => {

    const db = getDb();
    const config_id = req.params.id;
    const keystore = db.prepare(`SELECT * FROM metaconfigs WHERE config_id = ? ORDER BY last_update ${SORT_ORDER};`).get(config_id);

    // add't cleanup
    //
    if (res.keystore) {

        res.keystore = JSON.parse(res.keystore);
    }
    if (res.tags) {

        res.tags = JSON.parse(res.tags);
    }

    db.close();
    res.json(keystore);
}


module.exports = { get, post, add_get, add_post, enabled_configurations, config_by_id };