const {getDb} = require("../db/db");
const {decrypt} = require("../constants");
const get = (req, res) => {
    return res.render('index.html')
}

const post = (req, res) => {

    const db = getDb();
    const username = req.body.username;
    const password = req.body.password;

    if (username && password) {

        // verify decrypted user first
        //
        const decrypted_row = db.prepare('SELECT * FROM accounts WHERE username = ? AND password = ? AND password_encrypted = ?').get(username, password, 0);

        if (decrypted_row) {

            req.session.loggedin = true;
            req.session.username = username;
            req.session.password = password;
            req.session.password_encryption = false;

            res.redirect('/portal');
            return;
        }

        const encrypted_row = db.prepare('SELECT * FROM accounts WHERE username = ? AND password_encrypted = ?').get(username, 1);

        if (encrypted_row) {

            try {

                const decrypted_password = decrypt(encrypted_row.password, password);

                if (password === decrypted_password) {

                    req.session.loggedin = true;
                    req.session.username = username;
                    req.session.password = password;
                    req.session.password_encryption = true;

                    res.redirect('/portal');
                } else {

                    res.render('index.html', { msg: 'Incorrect username or password' });
                }

            } catch (error) {

                console.log('Bad password');
                res.render('index.html', { msg: 'Incorrect username or password' });
            }

        } else {

            res.render('index.html', { msg: 'Incorrect username or password' });
        }

        db.close();
    } else {

        res.render('index.html', { msg: 'Incorrect username or password' });
    }
}

const logout = (req, res) => {

    req.session.destroy();
    res.redirect('/');
}

module.exports = { get, post, logout }
