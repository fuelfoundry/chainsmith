const {getDb} = require("../db/db");
const {auth, SORT_ORDER, NOW, decrypt, encrypt} = require("../constants");
const get = (req, res) => {
    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);
    const keystores_enabled = db.prepare(`SELECT * FROM keyvault WHERE ? = 1`).get('enable');
    const keystores_disabled = db.prepare(`SELECT * FROM keyvault WHERE ? = 0`).get('enable');
    //ORDER BY id ${SORT_ORDER};

    if (req.session.loggedin) {

        if (account_row) {

            const added = req.query.added === 'true';

            res.render('keystore.html', { account: account_row, keystores_enabled, keystores_disabled, added:added});
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}

const keystore_by_id = async (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    //await auth(db, req, res);

    //const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);
    const keystore_id = req.params.id;
    const keystore = db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(keystore_id);

    // parse 'keystore' and 'tags' fields
    if (keystore) {

        keystore.keystore = JSON.parse(keystore.keystore);
        keystore.tags = JSON.parse(keystore.tags);



        if (keystore.password_encrypted === 1) {

            keystore.password = decrypt(keystore.password, req.session.password);
            //console.log('keystore.password_encryption:',keystore.password_encryption)
            //console.log('keystore.password:',keystore.password)
        }
    }

    db.close();
    res.json(keystore);
}

const add = (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    if (req.session.loggedin) {

        if (account_row) {

            res.render('keystore_add.html', { });
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}

const add_post = async (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();

    const keystore_name = req.body.keystore_name;
    const keystore_data = req.body.keystore_data;
    const enable = req.body.enable ? 1 : 0
    const keystore_password = req.body.keystore_password;

    const tags = {

        privatenet: req.body.privatenet ? 1 : 0,
        testnet: req.body.testnet ? 1 : 0,
        mainnet: req.body.mainnet ? 1 : 0,
        validator: req.body.validator ? 1 : 0,
        walletnode: req.body.walletnode ? 1 : 0,
        admin_mainchain: req.body.admin_mainchain ? 1 : 0,
        admin_subchain: req.body.admin_subchain ? 1 : 0
    };
    const tags_db = JSON.stringify(tags);
    const last_state = 10;
    try {

        if (req.session.password_encryption === true) {

            let encrypted_password = encrypt(keystore_password, req.session.password);

            await db.prepare(`INSERT INTO keyvault ("name", "keystore", "tags", "password", "last_state", "last_update", "enable", "password_encrypted") VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(keystore_name, keystore_data, tags_db, encrypted_password, last_state, NOW(), enable, 1);
        } else {

            await db.prepare(`INSERT INTO keyvault ("name", "keystore", "tags", "password", "last_state", "last_update", "enable") VALUES (?, ?, ?, ?, ?, ?, ?)`).run(keystore_name, keystore_data, tags_db, keystore_password, last_state, NOW(), enable);
        }

        res.redirect('/keystore?added=true');
    } catch (err) {

       console.log('err:',err)
    }
}


const edit_get = async (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const id = req.params.id;
    const db = getDb();

    let keystore = await db.prepare(`SELECT name, password, last_update, enable FROM keyvault WHERE id = ?`).get(id);

    let keystore_name = keystore.name;
    //let password = keystore.password;
    //let last_update = keystore.last_update;
    let enable = keystore.enable;

    let enableStr = (enable == 1) ? "checked" : "";
   //keystore_name

    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    if (req.session.loggedin) {

        if (account_row) {

            res.render('keystore_edit.html', { id, keystore_name, enableStr });
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

    const keystore_name = req.body.keystore_name;
    const enable = req.body.enable ? 1 : 0
    let keystore_password = req.body.keystore_password;

    const last_state = 10;

    try {

        if (keystore_password.length > 0) {

            if (req.session.password_encryption === true) {

                keystore_password = encrypt(keystore_password, req.session.password);
            }

            await db.prepare(`UPDATE keyvault SET name = ?, password = ?, last_state = ?, last_update = ?, enable = ? WHERE id = ?`).run(keystore_name, keystore_password, last_state, NOW(), enable, id);
        } else {
            await db.prepare(`UPDATE keyvault SET name = ?, last_state = ?, last_update = ?, enable = ? WHERE id = ?`).run(keystore_name, last_state, NOW(), enable, id);
        }

        res.redirect('/keystore?edited=true');
    } catch (err) {

        console.log('err:',err)
    }
}


const enabled_keystores = (req, res) =>{

    if (!req.session.loggedin) { res.redirect('/'); return; }

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

    const enable = req.params.enable === 'enabled' ? 1 : 0;
    const keystores = db.prepare(`SELECT * FROM keyvault WHERE enable = ? ORDER BY id ${SORT_ORDER};`).all(enable);

    db.close();
    res.json(keystores);
}

module.exports = { get, add, add_post, edit_get, edit_post, enabled_keystores, keystore_by_id };