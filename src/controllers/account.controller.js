
const { getDb } = require("../db/db");
const { SORT_ORDER, encrypt, decrypt, NOW} = require("../constants");

const get = (req, res)  => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);
    const keystores_enabled = db.prepare(`SELECT * FROM keyvault WHERE ? = 1`).get('enable');
    const keystores_disabled = db.prepare(`SELECT * FROM keyvault WHERE ? = 0`).get('enable');
    //ORDER BY id ${SORT_ORDER};

    if (req.session.loggedin) {

        if (account_row) {

            const added = req.query.added === 'true';

            res.render('account.html', { account: account_row, keystores_enabled, keystores_disabled, added:added});
        } else {

            res.render('/', { message: 'Account error' });
        }
    } else {

        res.redirect('/');
    }

    db.close();
}


const tools_privatenet_mintmocktheta = (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const keystore_id = req.params.id;
    const keystore = db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(keystore_id);

    let wallet = '';
    // parse 'keystore' and 'tags' fields
    if (keystore) {

        keystore.keystore = JSON.parse(keystore.keystore);
        keystore.tags = JSON.parse(keystore.tags);
        //wallet = keystore.keystore.address;
    }

    db.close();

    const { mintMockWrappedThetaOnMainchain } = require('../sdk/mintMockWrappedTheta');

// Call the function with the desired parameters
    const receiverAddr = '0x5CbDd86a2FA8Dc4bDdd8a8f69dBa48572EeC07FB';
    const amountInWei = '1000000000000000000';
    const minterKey = keystore.keystore;
    const minterKeyPassword = keystore.password;

    mintMockWrappedThetaOnMainchain(receiverAddr, amountInWei, minterKey, minterKeyPassword)
        .catch(error => {
            console.error('Error:', error);
        });

    res.json(keystore);
}


const account_by_id = (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const id = req.params.id;
    const account = db.prepare(`SELECT * FROM accounts WHERE id = ?`).get(id);

    db.close();
    res.json(account);
}


const add = (req, res) => {

    const db = getDb();
    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    if (req.session.loggedin) {

        if (account_row) {

            res.render('account_add.html', { });
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

    try {

        await db.prepare(`INSERT INTO keyvault ("name", "keystore", "tags", "password", "enable") VALUES (?, ?, ?, ?, ?)`).run(keystore_name, keystore_data, tags_db, keystore_password, enable);

        res.redirect('/account?added=true');
    } catch (err) {

       console.log('err:',err)
    }
}


const edit_get = async (req, res) => {

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const id = req.params.id;
    const db = getDb();
    const account = await db.prepare(`SELECT username, email, password_encrypted, last_update FROM accounts WHERE id = ?`).get(id);
    const username = account.username;
    const email = account.email;
    const password_encrypted = account.password_encrypted;
    let password_encryptedStr = (password_encrypted == 1) ? "checked" : "";

    const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

    if (req.session.loggedin) {

        if (account_row) {

            res.render('account_edit.html', { id, username, email, password_encrypted, password_encryptedStr });
        } else {

            res.render('/', { message: 'Login failed' });
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
    const email = req.body.email;
    const password = req.body.password;
    const password_confirmed = req.body.password_confirm;
    const password_encrypted = req.body.password_encrypted ? 1 : 0;

    try {

        if (password.length > 0 && password === password_confirmed) {

            await db.prepare(`UPDATE accounts SET email = ?, password = ?, last_update = ? WHERE id = ?`).run(email, password, NOW(), id);

            const account_row = db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username);

            // ignore password_encrypted checkbox === 1, purely aesthetic after implemented
            //
            if (account_row.password_encrypted === 1 && req.session.password_encryption === true) {

                //encrypt existing password

                // dup for easy reading
                //
                const previous_encryption_password = req.session.password;
                const new_encryption_password = password;

                // update encrypted user password
                //
                console.log("updating encrypted admin password::")
                const encrypted_password = encrypt(password, new_encryption_password);

                await db.prepare(`UPDATE accounts SET password = ?, last_update = ? WHERE id = ?`).run(encrypted_password, NOW(), id);

                console.log("re-encrypting keystore passwords::")

                // set password_encrypted = 1
                //
                console.log("encrypting keystore passwords::")
                const encrypted_keyvault_rows = db.prepare('SELECT * FROM keyvault WHERE password_encrypted == 1').all();

                for (const row of encrypted_keyvault_rows) {

                    //console.log("old encrypted password:", row.password);
                    let decryptedPassword = decrypt(row.password, previous_encryption_password);
                    //console.log("old password decrypted:", decryptedPassword)
                    let encryptedPassword = encrypt(decryptedPassword, new_encryption_password);
                    //console.log("old password re-encrypted:", encryptedPassword)

                    db.prepare('UPDATE keyvault SET password = ? WHERE id == ?').run(encryptedPassword, row.id);
                }

                console.log("encrypting ssh user passwords::")
                const nodes_rows = db.prepare('SELECT * FROM nodes WHERE password_encrypted == 1').all();

                for (const row of nodes_rows) {

                    //console.log("old encrypted password:", row.ssh_pass);
                    let decryptedPassword = decrypt(row.ssh_pass, previous_encryption_password);
                    //console.log("old password decrypted:", decryptedPassword)
                    let encryptedPassword = encrypt(decryptedPassword, new_encryption_password);
                    //console.log("old password re-encrypted:", encryptedPassword)

                    db.prepare('UPDATE nodes SET ssh_pass = ? WHERE id == ?').run(encryptedPassword, row.id);
                }

                req.session.password = new_encryption_password;
            }

            // first time run
            //
            if (account_row.password_encrypted === 0 && password_encrypted === 1) {

                // set decryption string
                //
                const decrypt_password = password;

                req.session.password = decrypt_password;
                req.session.password_encryption = true;

                // set new encrypted password
                //
                console.log("encrypting admin password::")
                const encrypted_password = encrypt(password, decrypt_password);

                await db.prepare(`UPDATE accounts SET password_encrypted = ?, password = ?, last_state = ?, last_update = ? WHERE id = ?`).run(password_encrypted, encrypted_password, 10, NOW(), id);

                console.log("enabling encryption::")

                // set password_encrypted = 1
                //
                console.log("encrypting keystore passwords::")
                const keyvault_rows = db.prepare('SELECT * FROM keyvault WHERE password_encrypted == 0').all();

                for (const row of keyvault_rows) {

                    let encryptedPassword = encrypt(row.password, decrypt_password);

                    db.prepare('UPDATE keyvault SET password = ?, password_encrypted = 1 WHERE id == ?').run(encryptedPassword, row.id);
                }

                console.log("encrypting ssh user passwords::")
                const nodes_rows = db.prepare('SELECT * FROM nodes WHERE password_encrypted == 0').all();

                for (const row of nodes_rows) {

                    let encryptedPassword = encrypt(row.ssh_pass, decrypt_password);

                    db.prepare('UPDATE nodes SET ssh_pass = ?, password_encrypted = 1 WHERE id == ?').run(encryptedPassword, row.id);
                }
            }
        }

        res.redirect('/account?edited=true');
    } catch (err) {

        console.log('err:',err)
    }
}


const enabled_accounts = (req, res) =>{

    if (!req.session.loggedin) { res.redirect('/'); return; }

    const db = getDb();
    const enable = req.params.enable === 'enabled' ? 1 : 0;
    const keystores = db.prepare(`SELECT * FROM accounts WHERE enable = ? ORDER BY id ${SORT_ORDER};`).all(enable);

    res.json(keystores);
}


module.exports = { get, add, add_post, edit_get, edit_post, enabled_accounts, account_by_id, tools_privatenet_mintmocktheta };