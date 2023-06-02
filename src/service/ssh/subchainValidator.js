const {Node} = require("./node");
const {getDb} = require("../../db/db");
const {subchainValConfig, subchainEthRpc} = require("../../configs/configs");
const {Client} = require("ssh2");


class SubchainValidator extends Node {
    constructor(nodeInfo) {
        super(nodeInfo)
        const db = getDb();
        const genesis = db.prepare(`SELECT * FROM genesis WHERE id = ?`).get(this.nodeInfo.genesis_id);
        db.close();

        this.genesis = genesis;
        this.requiredPackages = "screen make build-essential git curl wget jq"
        this.packageSubFolder = "theta-protocol-subchain";
        this.gitUrl = "https://github.com/thetatoken/theta-protocol-subchain"
        this.subchainDir = "~/theta/subchain"
    }

    async install() {

        try {
            this.updateNode(3);
            await this.installPackages(this.requiredPackages)
            this.updateNode(4);
            await this.downloadGolang()
            this.updateNode(5);
            await this.downloadWalletNode();
            await this.downloadSubchain();
            await this.downloadEthAdapter();
            this.updateNode(6);
            await this.buildWalletNode();
            await this.buildSubchain();
            await this.buildAdaptor();
            await this.createFolderStructure();
            await this.copyBinaries();
            await this.saveKeystore(this.keystore_row.keystore, `${this.subchainDir}/validator/key/encrypted/${this.address}`);
            this.updateNode(7);
            await this.writeSnapshot();
            this.updateNode(8);
            await this.writeFileToPath(subchainValConfig(this.genesis), `${this.subchainDir}/validator/config.yaml`);
            await this.writeFileToPath(subchainEthRpc, `${this.subchainDir}/ethrpc/config.yaml`)
            await this.runRpc(`${this.subchainDir}/bin`, 'rpc-subchain-val');
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

    /**
     * Download the subchain github repo if it has not been downloaded before
     * @returns {Promise<unknown>}
     */
    downloadSubchain = async () => {
        return this.nonSudoCommand(`mkdir -p ${this.packageRoot} && cd ${this.packageRoot} && if [ ! -d "${this.packageSubFolder}" ] ; then git clone ${this.gitUrl} ; fi`)
    }

    /**
     * Build the subchain
     * @returns {Promise<unknown>}
     */
    buildSubchain = async () => {
        return this.nonSudoCommand(`cd ${this.packageRoot}/${this.packageSubFolder} && export GO111MODULE=on && sleep 1 && make install`);
    }

    /**
     * Create the folder structure according to the following structure:
     * ~/theta
     *      /subchain
     *          /bin <--- for the thetasubcchain thetasubcli and theta-eth-rpc-adaptor
     *          /ethrpc <---- for the rpc config.yaml
     *          /validator <--- contains the subchain validator config.yaml and snapshot
     *                      /db <---- db related files (auto generated)
     *                      /key
     *                              /encrypted <--- the keystore for the node
     * @returns {Promise<unknown>}
     */
    createFolderStructure = async () => {
        return this.nonSudoCommand(`mkdir -p ${this.subchainDir}/bin && mkdir -p ${this.subchainDir}/ethrpc && mkdir -p ${this.subchainDir}/validator/key/encrypted`);
    }

    /**
     * Move thetasubchain, thetasubcli and theta-eth-rpc-adaptor to ~/theta/subchain/bin
     * @returns {Promise<unknown>}
     */
    copyBinaries = async () => {
        return this.nonSudoCommand(`cp -n "$GOPATH/bin/thetasubchain" "$GOPATH/bin/thetasubcli" "$GOPATH/bin/theta-eth-rpc-adaptor" ${this.subchainDir}/bin`)
    }

    /**
     * Run the subchain in a screen session
     * @returns {Promise<unknown>}
     */
    run = () => {
        const command = `cd ${this.subchainDir}/bin && screen -S subchain-val -L -m bash -c "./thetasubchain start --config=../validator --password=${this.keystore_row.password}"`
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

    /**
     * Write the generated genesis snapshot for the subchain to the snapshot file located in ~/theta/subchain/validator
     * @returns {Promise<unknown>}
     */
    writeSnapshot = async () => {
        await this.writeBytes(this.genesis.snapshot, `snapshot`);
        return this.nonSudoCommand(`sleep 5 && mv snapshot ${this.subchainDir}/validator/snapshot`)
    }


}


module.exports = {SubchainValidator};
