const {Node} = require('./node');
const {mainnetMainchainRpc, mainnetEthRpc, testnetMainchainWalletRpc} = require("../../configs/configs");
const {Client} = require("ssh2");
const {keystore_by_id} = require("../../controllers/keystore.controller");
const {getDb} = require("../../db/db");


class MainchainValidator extends Node {
    constructor(nodeInfo) {
        super(nodeInfo);
        this.requiredPackages = "screen make build-essential git curl wget jq"
        this.packageSubFolder = "theta";
        this.gitUrl = "https://github.com/thetatoken/theta-protocol-ledger"
        this.nodeDir = "~/theta/mainchain"
        this.snapshotUrl = {
            testnet: 'https://theta-testnet-backup.s3.amazonaws.com/snapshot/snapshot',
            mainnet: 'https://mainnet-data.thetatoken.org/snapshot'
        }
    }

    async install() {

        try {
            this.updateNode(3);
            await this.installPackages(this.requiredPackages);
            // potentially log something? i.e. packages installed
            this.updateNode(4);
            await this.downloadGolang();
            // potentially log something? I.e. golang installed
            this.updateNode(5);
            await this.downloadWalletNode();
            await this.downloadEthAdapter();
            this.updateNode(6);
            await this.buildWalletNode();
            await this.buildAdaptor();
            // // guardian node is built when this is finished
            await this.createFolderStructure();
            await this.moveBinaries();
            await this.saveKeystore(this.keystore_row.keystore, 'path');
            this.updateNode(7);
            await this.downloadSnapshots()
            //
            this.updateNode(8);
            await this.saveConfig(mainnetEthRpc, `${this.nodeDir}/ethrpc/config.yaml`)
            await this.saveConfig(testnetMainchainWalletRpc, `${this.nodeDir}/walletnode/config.yaml`)
            await this.runRpc(`${this.nodeDir}/bin`, 'rpc-wallet-node');
            await this.run();
            this.updateNode(10);
        } catch (e) {
            console.log("-----------------------ERROR-----------------------");
            console.log(e);

            try {
                console.log(e.stack);
            } catch (err) {}
        }

    }


    createFolderStructure = async () => {
        return this.nonSudoCommand(`mkdir -p ${this.nodeDir}/bin && mkdir -p ${this.nodeDir}/walletnode/key/encrypted && mkdir -p ${this.nodeDir}/ethrpc`);
    }

    moveBinaries = async () => {
        return this.nonSudoCommand(`cp -n "$GOPATH/bin/theta" "$GOPATH/bin/thetacli" "$GOPATH/bin/theta-eth-rpc-adaptor" ${this.nodeDir}/bin`);
    }

    saveKeystore = async () => {
        const address = JSON.parse(this.keystore_row.keystore).address;
        return this.writeFileToPath(this.keystore_row.keystore, `${this.nodeDir}/walletnode/key/encrypted/${address}`);
    }


    buildGuardianNode = async () => {
        let branchCommand = '';

        if (this.nodeInfo.mainchain === 'testnet') {
            branchCommand = 'git checkout sc-privatenet && git pull origin sc-privatenet &&';
        }

        return this.nonSudoCommand(`cd ${this.packageRoot}/${this.packageSubFolder} && ${branchCommand} export GO111MODULE=on && sleep 1 && make install`)
    }

    downloadSnapshots = async () => {
        let uri = this.snapshotUrl.mainnet;
        if (this.nodeInfo.mainchain === 'testnet') {
            uri = this.snapshotUrl.testnet;
        } else if (this.nodeInfo.mainchain === 'private') {
            return;
        }

        return this.nonSudoCommand(`wget -O ${this.nodeDir}/walletnode/snapshot ${uri}`);
    }

    run = () => {
        const command = `cd ~/theta/mainchain/bin && screen -S wallet-node -L -m bash -c "./theta start --config=../walletnode --password=${this.keystore_row.password}"`
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


    getStatus = () => {
        const command = 'curl -X POST -H \'Content-Type: application/json\' --data \'{"jsonrpc":"2.0","method":"theta.GetStatus","params":[],"id":1}\' http://localhost:16888/rpc'
        const conn = new Client();
        let fullStream = "";
        return new Promise((resolve, reject) => {
            conn.on('ready', () => {
                conn.exec(command, (err, stream) => {
                    stream.on('close', (code, signal) => {
                        console.log(fullStream);
                        conn.end()
                    });
                    stream.on('data', (data) => {
                        fullStream += data.toString().trim();
                    })
                })
            }).connect(this.nodeInfo);
        })
    }
}


module.exports = {MainchainValidator};
