const crypto = require('crypto');

const DEBUG = true;
const SORT_ORDER = 'DESC';

const auth = async (db, req, res) => {

   // const db = getDb();
    if (!req.session.loggedin) return res.redirect('/');
    if (!db.prepare('SELECT * FROM accounts WHERE username = ?').get(req.session.username)) return res.render('/', { message: 'Error: CS001' });
}

function NOW() {
    return String(new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''));
}

// const backup = (db) => {
const encrypt = (text, password) => {

    const iv = crypto.randomBytes(12);
    const salt = crypto.randomBytes(64);
    const key = crypto.pbkdf2Sync(password, salt, 2145, 32, 'sha512');
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const tag = cipher.getAuthTag().toString('hex');

    return `${salt.toString('hex')}:${iv.toString('hex')}:${encrypted}:${tag}`;
}

const decrypt = (data, password) => {

    //console.log('data',data)
    const parts = data.split(':');
    const salt = Buffer.from(parts[0], 'hex');
    const iv = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];
    const tag = Buffer.from(parts[3], 'hex');
    const key = crypto.pbkdf2Sync(password, salt, 2145, 32, 'sha512');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
}

const forgeTokenNames = [
    "Battle Token","Dragon Coin","Ace Coin","Awesome Token","Hammer Coin","Inferno Coin", "Spark Coin", "Thunder Coin","Valor Coin", "Meta Coin",
    "Veridian Token", "Iron Coin","Krypto Coin","Land Coin","Liger Coin","Long Coin","Max Token"
]

const forgeTokenSymbols = [
    "BATTLE","DRAGON","ACE","AWESOME","HAMMER","INFERNO","SPARK","THUNDER","VALOR","META",
    "VERIDIAN","IRON","KRYPTO","LAND","LIGER","LONG","MAX"
]

function getRandomIndex(max) {
    return Math.floor(Math.random() * max);
}

module.exports = {

    DEBUG,
    NOW,
    SORT_ORDER,
    auth,
    getRandomIndex,
    encrypt,
    decrypt,
    forgeTokenNames,
    forgeTokenSymbols,
    golangVersion: "1.19.9"
}