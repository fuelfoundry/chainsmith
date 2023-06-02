const {getDb} = require("../../db/db");
const {Client} = require("ssh2");
const {golangVersion, decrypt} = require("../../constants");

/**
 * The root class for all the shared commands.
 */
class Node {
    constructor(nodeInfo) {
        const {host, ssh_user, ssh_pass, keystore_id} = nodeInfo;

        if (!(host && ssh_pass && ssh_user && keystore_id)) {
            //values not set, throw error;
        }

        nodeInfo.port = nodeInfo.port || 22;
        nodeInfo.user = ssh_user;
        nodeInfo.password = ssh_pass;

        const db = getDb();
        const keystore_row = db.prepare(`SELECT * FROM keyvault WHERE id = ?`).get(keystore_id);
        db.close();

        if (keystore_row.password_encrypted == 1) {
            console.log('decrypting')
            keystore_row.password = decrypt(keystore_row.password, nodeInfo.decryptkey);
            console.log(keystore_row.password)
        }

        const address = JSON.parse(keystore_row.keystore).address;

        this.nodeInfo = nodeInfo;
        this.keystore_row = keystore_row;
        this.address = address;
        this.packageRoot = "$GOPATH/src/github.com/thetatoken";
        this.builtBinaryLocation = `$GOPATH/bin`
        this.rpcSubFolder = "theta-eth-rpc-adaptor";
        this.rpcGitUrl = "https://github.com/thetatoken/theta-eth-rpc-adaptor"
        this.walletNodeFolder = "theta";
        this.walletGitUrl = "https://github.com/thetatoken/theta-protocol-ledger";
    }

    updateNode = async (last_state) => {

        const db = getDb();

        console.log('UPDATE nodes SET last_state = ? WHERE id = ?',last_state, this.nodeInfo.id)

        db.prepare('UPDATE nodes SET last_state = ? WHERE id = ?').run(last_state, this.nodeInfo.id);
        db.close();
    }

    runCommandsAsSudo = async (command) => {
        const conn = new Client();
        return new Promise((resolve, reject) => {
            conn.on('ready', () => {
                console.log("executing");
                conn.exec(`. /etc/profile; ${command}`, {pty: true}, (err, stream) => {
                    if (err) throw err;
                    stream.on('close', (code, signal) => {
                        conn.end();
                        if (code === 0) {
                            resolve(true);
                        }

                    })
                    stream.on('data', (data) => {
                        // console.log(data)
                        console.log(data.toString())
                        if (data.toString().substring(0, 6) === '[sudo]') {
                            stream.write(this.nodeInfo.password + '\n');
                        } else if (data.toString().includes("Pending kernel upgrade")) {
                            conn.end();
                        }
                    })
                })
            }).connect(this.nodeInfo);
        })
    }
    nonSudoCommand = async (command) => {
        const conn = new Client();
        return new Promise((resolve, reject) => {
            conn.on('ready', () => {
                conn.exec(`. /etc/profile; ${command}`, (err, stream) => {
                    // if (err) throw err;
                    stream.on('close', (code, signal) => {
                        console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
                        conn.end()
                        if (code === 0) {
                            resolve(true)
                        }
                    }).on('data', (data) => {
                        if (data.toString().includes('godownloaded')) {
                            conn.end();
                        }

                    }).stderr.on('data', (data) => {
                            console.log('STDERR: ' + data);
                    });

                })
            }).connect(this.nodeInfo)
        });
    }

    /**
     * Download the eth-rpc-adaptor in case it is not present
     * @returns {Promise<unknown>}
     */
    downloadEthAdapter = () => {
        return this.nonSudoCommand(`mkdir -p ${this.packageRoot} && cd ${this.packageRoot} && if [ ! -d "${this.rpcSubFolder}" ] ; then git clone ${this.rpcGitUrl}; fi`);
    }

    /**
     * Build the eth-rpc-adapter
     * In addition it will download the go mod for golang/x/sys, this is required for building
     * @returns {Promise<unknown>}
     */
    buildAdaptor = async () => {
        return this.nonSudoCommand(`cd ${this.packageRoot}/${this.rpcSubFolder} && export GO111MODULE=on && go mod download golang.org/x/sys && sleep 1 && make install`);
    }

    saveConfig = async (config, path) => {
        return this.writeFileToPath(config, path)
    }

    /**
     * Download the theta-protocol-ledger and save it as theta so it can be used to build the subchain, rpc adapter and
     * the wallet node itself
     * @returns {Promise<unknown>}
     */
    downloadWalletNode = async () => {
        let branchCommand = '';

        if (this.nodeInfo.mainchain === 'testnet') {
            branchCommand = 'git checkout sc-privatenet && git pull origin sc-privatenet &&';
        }

        return this.nonSudoCommand(`mkdir -p ${this.packageRoot} && cd ${this.packageRoot} && if [ ! -d "${this.walletNodeFolder}" ] ; then git clone ${this.walletGitUrl} ${this.walletNodeFolder}; fi && cd ${this.walletNodeFolder} && ${branchCommand} go mod download golang.org/x/sys`)
    }

    /**
     * Build the wallet node, this step is required to be run before the building of the eth-rpc-adaptor
     * @returns {Promise<unknown>}
     */
    buildWalletNode = async () => {
        return this.nonSudoCommand(`cd ${this.packageRoot}/${this.walletNodeFolder} &&  export GO111MODULE=on && sleep 1 && make install`)
    }


    /**
     * Save a small file to the given path
     * @param data
     * @param path
     * @returns {Promise<unknown>}
     */
    writeFileToPath = (data, path) => {
        return this.nonSudoCommand(`echo -n '${data}' > ${path}`, this.nodeInfo);
    }

    saveKeystore = (data, path) => {
        return this.writeFileToPath(data,path);
    }

    installPackages = async (packages) => {
        return this.runCommandsAsSudo(`sudo apt update && sudo apt install -y ${packages}`);
    }

    checkIfGolangIsInstalled = async() => {
        const conn = new Client()
        return new Promise((resolve, reject) => {
            conn.on('ready', () => {
                conn.exec('. /etc/profile; if ! command -v go &> /dev/null; then echo "golang is not installed"; exit; fi', (err, stream) => {
                    if (err) throw err;
                    stream.on('close', (code, signal) => {
                        resolve(true)
                        conn.end()
                    }).on('data', (data) => {
                        if (data.toString().includes('golang is not installed')){
                            resolve(false);
                        }
                    })
                })
            }).connect(this.nodeInfo)

        })
    }

    /**
     * Download the binaries associated with the specified golang version, remove the current version, unzip it,
     * save the go path variables to /etc/profile and remove the downloaded zip containing the binary
     * @returns {Promise<void>}
     */
    downloadGolang = async () => {
        const goIsInstalled =  await this.checkIfGolangIsInstalled();

        if(goIsInstalled === true) {
            return
        }

        const command = `curl -OL https://go.dev/dl/go${golangVersion}.linux-amd64.tar.gz && echo 'godownloaded'`
        await this.nonSudoCommand(command)
        await this.runCommandsAsSudo(`sudo rm -rf /usr/local/go && sudo tar -C /usr/local -xzf go${golangVersion}.linux-amd64.tar.gz && echo 'export PATH=$PATH:/usr/local/go/bin' | sudo tee -a /etc/profile && echo 'export GOPATH=$HOME/go' | sudo tee -a /etc/profile && rm go${golangVersion}.linux-amd64.tar.gz`)
    }

    writeBytes = async(data, path) => {
        console.log(path)
        const conn = new Client();
        conn.on('ready', () => {
            conn.sftp((err, sftp) => {
                sftp.on('close', (code, signal) => {
                    sftp.end();
                    console.log(code, signal)
                })
                sftp.writeFile('snapshot', data, (err) => {
                    console.log(err);
                });
            })
        }).connect(this.nodeInfo)
        // return this.nonSudoCommand(`echo -n -e '${data}' > ${path}`)
    }

    testConnection = () => {
        const conn = new Client();
        return new Promise((resolve, reject) => {
            conn.on('ready', () => {
                conn.exec('uptime', (err, stream) => {
                    if (err) throw err;
                    stream.on('close', (code, signal) => {
                        console.log('Stream :: close :: code: ' + code + ', signal: ' + signal);
                        conn.end();
                    }).on('data', (data) => {
                        resolve(true);
                    }).stderr.on('data', (data) => {
                        console.log('STDERR: ' + data);
                    });
                })
            }).connect(this.nodeInfo)
        });
    }

    runRpc = (binPath, screenName) => {
        const command = `cd ${binPath} && screen -S ${screenName} -L -m bash -c "./theta-eth-rpc-adaptor start --config=../ethrpc"`
        console.log(command)
        const conn = new Client();
        return new Promise((resolve, reject) => {
            conn.on('ready', () => {
                conn.exec(command, {pty: true}, (err, stream) => {
                    stream.on('close', (code, signal) => {
                        conn.end()
                        resolve(true)
                    }).on('data', (data) => {
                        conn.end();
                    })
                })
            }).connect(this.nodeInfo)
        })
    }

    testSudo = () => {
        const conn = new Client();
        return new Promise((resolve, reject) => {
            conn.on('ready', () => {
                conn.exec('sudo echo test', {pty: true}, (err, stream) => {
                    stream.on('close', (code, signal) => {
                        conn.end()
                    })
                    stream.on('data', (data) => {
                        if (data.toString().substring(0, 6) === '[sudo]') {
                            stream.write(this.nodeInfo.password + '\n');
                        } else if (data.toString().substring(0, 4) === "test") {
                            resolve(true)
                        }
                    })
                })
            }).connect(this.nodeInfo)
        })
    }
}


module.exports = {Node};
