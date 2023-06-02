const {Client} = require("ssh2");

const makeConnection = (req) => {
    const conn = new Client();
    return new Promise((resolve, reject) => {
        conn.on('ready', () => {
            resolve(true);
            conn.end();
        }).on('error', (e) => {
            reject(e)
            }

        ).connect({readyTimeout: 2000, ...req})
    })
}

const testConnection = async (hostInfo) => {
    try {
        await makeConnection(hostInfo);
        return true;
    } catch (e) {
        return false;
    }
}

module.exports = {testConnection}
