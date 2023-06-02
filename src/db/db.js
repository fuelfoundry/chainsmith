const Database = require('better-sqlite3');
const {NOW} = require('../constants');
//const subchain_governance_token_json = require('../contracts/SubchainGovernanceToken.json');
const subchain_governance_token_json = JSON.parse(require('fs').readFileSync(require('path').join(__dirname, '../contracts/SubchainGovernanceToken.json'), 'utf8'));


const init = () => {
    const db = open_connection();
    create_tables(db);
    insert_default_vars(db);
    return db;
}


const open_connection = () => {
    return new Database('metabase.db',{}); //verbose: console.log});
}


const backup = (db) => {
    db.backup(`backup-${Date.now()}.db`)
        .then(() => {
            console.log('backup complete!');
        })
        .catch((err) => {
            console.log('backup failed:', err);
        });
}


const types = ["Mainchain Wallet Node", "Subchain Validator Node", "Mainchain Validator Node", "Mainchain Guardian Node", "Mainchain Edge Node"];


const create_tables = (db) => {

//    db.prepare(`CREATE TABLE IF NOT EXISTS configurations (id INTEGER PRIMARY KEY AUTOINCREMENT, mainchain TEXT, mainchainID INTEGER, mainchainIDStr TEXT, mainchainRPC TEXT, wTHETAAddr TEXT, registrarOnMainchainAddr TEXT, govTokenContractAddr TEXT, mainchainTFuelTokenBankAddr TEXT, mainchainTNT20TokenBankAddr TEXT, mainchainTNT721TokenBankAddr TEXT, mainchainTNT1155TokenBankAddr TEXT, subchainID INTEGER, subchainIDStr TEXT, subchainRPC TEXT, subchainTFuelTokenBankAddr TEXT, subchainTNT20TokenBankAddr TEXT, subchainTNT721TokenBankAddr TEXT, subchainTNT1155TokenBankAddr TEXT, initialFee INTEGER, crossChainTransferFeeInTFuel INTEGER);`).run();
    db.prepare(`CREATE TABLE IF NOT EXISTS configurations (id INTEGER PRIMARY KEY AUTOINCREMENT, mainchain TEXT, mainchainID INTEGER, mainchainIDStr TEXT, mainchainRPC TEXT, wTHETAAddr TEXT, registrarOnMainchainAddr TEXT, mainchainTFuelTokenBankAddr TEXT, mainchainTNT20TokenBankAddr TEXT, mainchainTNT721TokenBankAddr TEXT, mainchainTNT1155TokenBankAddr TEXT, initialFee INTEGER, crossChainTransferFeeInTFuel INTEGER)`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS types (id INTEGER PRIMARY KEY AUTOINCREMENT,name TEXT NOT NULL, UNIQUE(name));`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS networks ("id" INTEGER NOT NULL DEFAULT 1, "network" INTEGER NOT NULL DEFAULT 'Theta Privatenet', "chain_id" INTEGER NOT NULL DEFAULT 366, PRIMARY KEY("id" AUTOINCREMENT));`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS accounts ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "username" TEXT NOT NULL DEFAULT 'admin' UNIQUE,"password" TEXT NOT NULL DEFAULT 'metachain', "password_encrypted" INTEGER NOT NULL DEFAULT 0, "email" TEXT NOT NULL DEFAULT 'concierge@fuelfoundry.io',"email_notify" INTEGER NOT NULL DEFAULT 0, "is_admin" INTEGER NOT NULL DEFAULT 1, "theta_rpc_privatenet" TEXT NOT NULL DEFAULT 'http://127.0.0.1:16888/rpc',"theta_rpc_testnet" TEXT NOT NULL DEFAULT 'http://54.151.72.227:16888/rpc', "theta_rpc_mainnet" TEXT NOT NULL DEFAULT 'http://127.0.0.1:16888/rpc' ,"eth_rpc_privatenet" TEXT NOT NULL DEFAULT 'http://127.0.0.1:16000/rpc',"eth_rpc_testnet" TEXT NOT NULL DEFAULT 'https://eth-rpc-api-testnet.thetatoken.org/rpc', "eth_rpc_mainnet" TEXT NOT NULL DEFAULT 'https://eth-rpc-api.thetatoken.org/rpc', "last_state" INTEGER NOT NULL DEFAULT -1, "last_update" TEXT NOT NULL DEFAULT '2020-01-01 00:00:01', "enable" INTEGER NOT NULL DEFAULT 1)`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS keyvault ("id" INTEGER NOT NULL UNIQUE, "name" TEXT NOT NULL DEFAULT 'Theta Wallet [Private/Testnet]', "keystore" TEXT DEFAULT '{"address":"2e833968e5bb786ae419c4d13189fb081cc43bab","crypto":{"cipher":"aes-128-ctr","ciphertext":"2dad160420b1e9b6fc152cd691a686a7080a0cee41b98754597a2ce57cc5dab1","cipherparams":{"iv":"7b3c44bc23961e32e277ac01ddb84505"},"kdf":"scrypt","kdfparams":{"dklen":32,"n":262144,"p":1,"r":8,"salt":"7afcf25c66f0205a5eaac94bf789f46dd6def4262d793e3b417d1a6ae8ea5056"},"mac":"4cbfaf270b3ba1ae5dab7c873b31159e1ed75add4d1e16206f9bb4bc3c6f9fdb"},"id":"046d2f92-8e6a-4e91-9785-248c9345b07f","version":3}', "tags" TEXT NOT NULL DEFAULT '{"admin_mainchain":1, "admin_subchain":1, "privatenet":1, "testnet":1, "mainnet":0, "walletnode":1, "validatornode":0}', "password"  TEXT NOT NULL DEFAULT 'qwertyuiop', "password_encrypted" INTEGER NOT NULL DEFAULT 0, "last_state" INTEGER NOT NULL DEFAULT -1,"last_update" TEXT NOT NULL DEFAULT '2020-01-01 00:00:01', "enable" INTEGER DEFAULT 1, PRIMARY KEY("id" AUTOINCREMENT));`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS nodes ("id" INTEGER,"name" TEXT NOT NULL,"type" INTEGER NOT NULL DEFAULT 0,"host" TEXT DEFAULT "localhost","ssh_key" TEXT NOT NULL DEFAULT '',"ssh_user" TEXT NOT NULL DEFAULT 'thetarocks',"ssh_pass" TEXT NOT NULL DEFAULT 'password', password_encrypted INTEGER NOT NULL DEFAULT 0,"is_local" INTEGER NOT NULL DEFAULT 1,"dir_root" TEXT NOT NULL DEFAULT '/home/fuelfoundry', "deploy_from_source"INTEGER NOT NULL DEFAULT 1,"version" TEXT NOT NULL DEFAULT '4.0.1',"mainchain_rpc_eth_host" TEXT NOT NULL DEFAULT '127.0.0.1', "mainchain_rpc_eth_port" INTEGER NOT NULL DEFAULT 18888,"keystore_id" INTEGER NOT NULL DEFAULT 1,"mainchain" TEXT NOT NULL DEFAULT 'testnet',"nap_mapping"INTEGER NOT NULL DEFAULT 1,"log_level" TEXT NOT NULL DEFAULT '*:info',"genesis_id" INTEGER NOT NULL DEFAULT 0,"last_state" INTEGER NOT NULL DEFAULT -1,"last_update" TEXT NOT NULL DEFAULT '2020-01-01 00:00:01',"enable" INTEGER NOT NULL DEFAULT 1, PRIMARY KEY("id" AUTOINCREMENT));`).run(); //FOREIGN KEY() REFERENCES "types"("id") ,"type" INTEGER NOT NULL DEFAULT 0

    db.prepare(`CREATE TABLE IF NOT EXISTS genesis ("id" INTEGER NOT NULL, "name" TEXT NOT NULL DEFAULT 'Theta Privatenet Genesis', "mainchain" TEXT NOT NULL DEFAULT 'privatenet', "subchain_id" TEXT NOT NULL DEFAULT '360777',"admin_mainchain_keystore_id" INTEGER NOT NULL DEFAULT 1, "fallback_receiver_keystore_id" INTEGER NOT NULL DEFAULT 1, "validator_count" INTEGER NOT NULL DEFAULT 1,"initial_validator1_keystore_id" INTEGER NOT NULL DEFAULT 1,"initial_validator1_govtoken_stake" TEXT NOT NULL DEFAULT '100000000000000000000000',"initial_validator2_keystore_id" INTEGER NOT NULL DEFAULT 0,"initial_validator2_govtoken_stake" TEXT NOT NULL DEFAULT '0', "initial_validator3_keystore_id" INTEGER NOT NULL DEFAULT 0,"initial_validator3_govtoken_stake" TEXT NOT NULL DEFAULT '0', "initial_validator4_keystore_id" INTEGER NOT NULL DEFAULT 0,"initial_validator4_govtoken_stake" TEXT NOT NULL DEFAULT '0', "initial_validator5_keystore_id" INTEGER NOT NULL DEFAULT 0,"initial_validator5_govtoken_stake" TEXT NOT NULL DEFAULT '0', "init_validator_json" TEXT NOT NULL DEFAULT '[{"address": "2E833968E5bB786Ae419c4d13189fB081Cc43bab","stake": "100000000000000000000000"}]', "cross_chain_fee_setter" TEXT NOT NULL DEFAULT '0x2E833968E5bB786Ae419c4d13189fB081Cc43bab', "chain_registrar" TEXT NOT NULL DEFAULT '0x08425D9Df219f93d5763c3e85204cb5B4cE33aAa', "tfuel_token_bank" TEXT NOT NULL DEFAULT '0x5a443704dd4B594B382c22a083e2BD3090A6feF3', "tnt20_token_bank" TEXT NOT NULL DEFAULT '0x47e9Fbef8C83A1714F1951F142132E6e90F5fa5D', "tnt721_token_bank" TEXT NOT NULL DEFAULT '0x8Be503bcdEd90ED42Eff31f56199399B2b0154CA', "tnt1155_token_bank" TEXT NOT NULL DEFAULT '0x47c5e40890bcE4a473A49D7501808b9633F29782', "balance_checker" TEXT NOT NULL DEFAULT '0x29b2440db4A256B0c1E6d3B4CDcaA68E2440A08f', "genesis_blockhash" TEXT NOT NULL DEFAULT '0x1e006b532d9a4871976f29c496e713a4d9c089b3a02ad38e40353200867bfadc', "snapshot" BLOB, "port" INTEGER NOT NULL DEFAULT 12100, "min_block_interval" INTEGER NOT NULL DEFAULT 1, "update_interval" INTEGER NOT NULL DEFAULT 3000, "last_state" INTEGER NOT NULL DEFAULT -1, "last_update" TEXT NOT NULL DEFAULT '2020-01-01 01:01:01', "enable" INTEGER NOT NULL DEFAULT 1, PRIMARY KEY("id" AUTOINCREMENT))`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS govtoken ("id" INTEGER NOT NULL, "name" TEXT NOT NULL DEFAULT 'Subchain 88888 GovToken', "address" TEXT NOT NULL DEFAULT '0x7ad6cea2bc3162e30a3c98d84f821b3233c22647', "symbol" TEXT NOT NULL DEFAULT 'GOV88888', "mainchain" TEXT NOT NULL DEFAULT 'testnet', "subchain_governance_token_json" TEXT NOT NULL DEFAULT '', "staker_reward_per_block" TEXT NOT NULL DEFAULT '2000000000000000000', "init_distr_wallet_keystore_id" INTEGER NOT NULL DEFAULT 1,"decimals" TEXT NOT NULL DEFAULT '0', "tx_hash" TEXT NOT NULL DEFAULT '', "dynasty" TEXT NOT NULL DEFAULT '', "last_state" INTEGER NOT NULL DEFAULT -1,"last_update" TEXT NOT NULL DEFAULT '2020-01-01 00:00:01', "enable" INTEGER NOT NULL DEFAULT 1,PRIMARY KEY("id" AUTOINCREMENT));`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS subchain (id INTEGER PRIMARY KEY AUTOINCREMENT, subchain_name TEXT NOT NULL DEFAULT 'Example Testnet Subchain', mainchain TEXT NOT NULL DEFAULT 'testnet', genesis_id INTEGER NOT NULL DEFAULT 1, govtoken_id INTEGER NOT NULL DEFAULT 1, admin_keystore_id INTEGER NOT NULL DEFAULT 1, "tx_hash" TEXT NOT NULL DEFAULT '', "dynasty" TEXT NOT NULL DEFAULT '',  "metadata" TEXT NOT NULL DEFAULT '', "last_state" INTEGER NOT NULL DEFAULT -1, "last_update" TEXT NOT NULL DEFAULT '2020-01-01 00:00:01', "enable" INTEGER NOT NULL DEFAULT 1);`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS substake (
  "id" INTEGER PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL DEFAULT 'Initial stake to Theta Mainnet for Subchain 12345',
  "mainchain" TEXT NOT NULL DEFAULT 'testnet',
  "type" TEXT NOT NULL DEFAULT 'stake',
  "subchain_id" INTEGER NOT NULL DEFAULT 1,
  "admin_keystore_id" INTEGER NOT NULL DEFAULT 1,
  "validator_keystore_id" INTEGER NOT NULL DEFAULT 2,
  "govtoken_id" INTEGER NOT NULL DEFAULT 1,
  "govtoken_stake_wei" TEXT NOT NULL DEFAULT '100000000000000000000000',
  "wtheta_collateral_wei" TEXT NOT NULL DEFAULT '10000000000000000000000',
  "tfuel_fee_wei" TEXT NOT NULL DEFAULT '20000000000000000000000',
  "govtoken_approve_tx_hash" TEXT NOT NULL DEFAULT '',
  "govtoken_stake_tx_hash" TEXT NOT NULL DEFAULT '',
  "wtheta_collateral_tx_hash" TEXT NOT NULL DEFAULT '',
  "tfuel_fee_tx_hash" TEXT NOT NULL DEFAULT '',
  "vcm_address" TEXT NOT NULL DEFAULT '',
  "vsm_address" TEXT NOT NULL DEFAULT '',
  "validator_set" TEXT NOT NULL DEFAULT '[]',
  "dynasty" TEXT NOT NULL DEFAULT '',
  "next_validator_set" TEXT NOT NULL DEFAULT '[]',
  "next_dynasty" TEXT NOT NULL DEFAULT '',
  "last_state" INTEGER NOT NULL DEFAULT -1,
  "last_update" TEXT NOT NULL DEFAULT '2020-01-01 00:00:01',
  "enable" INTEGER NOT NULL DEFAULT 1
)`).run();

    const now = NOW();

    db.prepare(`CREATE TABLE IF NOT EXISTS metaconfigs ("config_id" INTEGER NOT NULL DEFAULT 1 UNIQUE,"config_name" TEXT DEFAULT 'Single Validator Theta Testnet Subchain',"description" TEXT NOT NULL DEFAULT 'Theta Testnet Default Subchain',"mainchain" TEXT NOT NULL DEFAULT 'testnet',"admin_mainchain_keystore_id" INTEGER NOT NULL DEFAULT 1,"subchain_name" TEXT NOT NULL DEFAULT 'Subchain 360777 - Theta Metachain Starter Chain',"subchain_id" INTEGER NOT NULL DEFAULT 360777,"fallback_receiver_keystore_id" INTEGER NOT NULL DEFAULT 1, "init_validator_set_json" TEXT NOT NULL DEFAULT '[{"address":"2E833968E5bB786Ae419c4d13189fB081Cc43bab","stake":"10000000000000000000000"}]',"init_stake_amount" TEXT NOT NULL DEFAULT 10000000000000000000000,"govtoken_id" INTEGER NOT NULL DEFAULT 1,"genesis_blockhash" TEXT NOT NULL DEFAULT 0,"tfuel_token_bank" TEXT NOT NULL DEFAULT '0x0',"tnt20_token_bank" TEXT NOT NULL DEFAULT '0x0',"tnt721_token_bank" TEXT DEFAULT '0x0',"tnt1155_token_bank" TEXT NOT NULL DEFAULT '0x0',"last_deploy" TEXT NOT NULL DEFAULT '2020-01-01 01:01:01',"last_deploy_state" INTEGER NOT NULL DEFAULT 0,"last_state" INTEGER NOT NULL DEFAULT -1,"last_update" TEXT NOT NULL DEFAULT '2020-01-01 00:00:01',"enable" INTEGER NOT NULL DEFAULT 1,PRIMARY KEY("config_id" AUTOINCREMENT))`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS metadata ("metadata_id" INTEGER DEFAULT now,"privatenet_mainchain_id" INTEGER NOT NULL DEFAULT 366,"privatenet_wrappedtheta" TEXT NOT NULL DEFAULT '0x7d73424a8256C0b2BA245e5d5a3De8820E45F390',"privatenet_chainregistraronmainchain" TEXT NOT NULL DEFAULT '0x08425D9Df219f93d5763c3e85204cb5B4cE33aAa',"privatenet_mocktnt20" TEXT NOT NULL DEFAULT '0x4fb87c52Bb6D194f78cd4896E3e574028fedBAB9',"privatenet_mocktnt721" TEXT NOT NULL DEFAULT '0xEd8d61f42dC1E56aE992D333A4992C3796b22A74',"privatenet_mocktnt1155" TEXT NOT NULL DEFAULT '0x47eb28D8139A188C5686EedE1E9D8EDE3Afdd543',"testnet_mainchain_id" INTEGER NOT NULL DEFAULT 365,"testnet_wrappedtheta" TEXT NOT NULL DEFAULT '0x90e6ca1087a2340da858069cb8d78d595e4ac798',"testnet_chainregistraronmainchain" TEXT NOT NULL DEFAULT '0x359878c13F8690710FDCb2cDB6Da1c0A92661b9E',"testnet_mocktnt20" INTEGER NOT NULL DEFAULT '0xC74c9a64d243bD2bc14C561E4D6B7DAAE19C73eA',"testnet_mocktnt721" INTEGER NOT NULL DEFAULT '0x166f67eDad98c3382323e7E8E64C8dD24d9C29a7',"testnet_mocktnt1155" INTEGER NOT NULL DEFAULT '0x9D2DAB964Eb49BDB944Bc91832123572b9a10619',"mainnet_mainchain_id" INTEGER NOT NULL DEFAULT 361,"mainnet_wrappedtheta" TEXT NOT NULL DEFAULT '0xTBD',"mainnet_chainregistraronmainchain" TEXT NOT NULL DEFAULT '0xTBD')`).run();

    db.prepare(`CREATE TABLE IF NOT EXISTS global ("configuration_active" INTEGER NOT NULL DEFAULT 1, 
"mainchain_ethrpc_config" TEXT NOT NULL DEFAULT '{"theta":{"rpcEndpoint":"http://127.0.0.1:16888/rpc"},"node":{"skipInitializeTestWallets":true},"rpc":{"enabled":true,"httpAddress":"127.0.0.1","httpPort":18888,"wsAddress":"127.0.0.1","wsPort":18889,"timeoutSecs":600,"maxConnections":2048},"log":{"levels":"*:debug"}}', 
"subchain_ethrpc_config" TEXT NOT NULL DEFAULT '{"theta":{"rpcEndpoint":"http://127.0.0.1:16900/rpc"},"node":{"skipInitializeTestWallets":true},"rpc":{"enabled":true,"httpAddress":"127.0.0.1","httpPort":19888,"wsAddress":"127.0.0.1","wsPort":19889,"timeoutSecs":600,"maxConnections":2048},"log":{"levels":"*:debug"}}',
"privatenet_walletnode_config" TEXT NOT NULL DEFAULT '{"genesis":{"hash":"0x45c579eb4d435ffcd37f0f76beaa772072cea146c4ecec2e52066904b80f4e0a"},"p2p":{"port":12000},"rpc":{"enabled":true}}', 
"mainnet_walletnode_config" TEXT NOT NULL DEFAULT '{"storage":{"statePruningRetainedBlocks":2048},"p2p":{"opt":0,"port":30001,"seeds":"3.20.109.241:21000,18.223.165.134:21000,35.184.232.41:21000,35.230.172.8:21000,34.83.204.5:21000","minNumPeers":24,"maxNumPeers":96,"natMapping":true},"rpc":{"port":16888,"enabled":true,"address":"127.0.0.1"},"log":{"levels":"*:info,guardian:debug"}}',
"testnet_walletnode_config" TEXT NOT NULL DEFAULT '{"genesis":{"hash":"0xa58cb754a23975c872ef06d8b54baf16eec88ad60f966368b950a6c16ae52ed9"},"storage":{"statePruningRetainedBlocks":2048},"p2p":{"port":16000,"seeds":"54.151.72.227:15872"},"rpc":{"enabled":true},"log":{"levels":"*:info"}}',
"fuelfoundry_partnerid" INTEGER NOT NULL DEFAULT 0,"fuelfoundry_telemetry" INTEGER NOT NULL DEFAULT 0);`).run();

    // on first run: add admin user //
    if (db.prepare('SELECT COUNT(*) FROM accounts').get()['COUNT(*)'] === 0) {

        db.prepare(`INSERT INTO "accounts" ("username", "password", "email", "email_notify", "is_admin") VALUES (?, ?, ?, ?, ?)`).run('admin', 'metachain', 'concierge@fuelfoundry.io', 0, 1);
        console.log("Default account added");
    }

    // on first run: add default configuration //
    if (db.prepare('SELECT COUNT(*) FROM configurations').get()['COUNT(*)'] === 0) {

        db.prepare(`INSERT INTO configurations (mainchain, mainchainID, mainchainIDStr, mainchainRPC, wTHETAAddr, registrarOnMainchainAddr, mainchainTFuelTokenBankAddr, mainchainTNT20TokenBankAddr, mainchainTNT721TokenBankAddr, mainchainTNT1155TokenBankAddr, initialFee, crossChainTransferFeeInTFuel) VALUES ('privatenet', 366, 'privatenet', 'http://localhost:18888/rpc', '0x7d73424a8256C0b2BA245e5d5a3De8820E45F390', '0x08425D9Df219f93d5763c3e85204cb5B4cE33aAa', '0xA10A3B175F0f2641Cf41912b887F77D8ef34FAe8', '0x6E05f58eEddA592f34DD9105b1827f252c509De0', '0x79EaFd0B5eC8D3f945E6BB2817ed90b046c0d0Af', '0x2Ce636d6240f8955d085a896e12429f8B3c7db26', 20000, 10)`).run();
        db.prepare(`INSERT INTO configurations (mainchain, mainchainID, mainchainIDStr, mainchainRPC, wTHETAAddr, registrarOnMainchainAddr, mainchainTFuelTokenBankAddr, mainchainTNT20TokenBankAddr, mainchainTNT721TokenBankAddr, mainchainTNT1155TokenBankAddr, initialFee, crossChainTransferFeeInTFuel) VALUES ('testnet', 365, 'testnet', 'https://eth-rpc-api-testnet.thetatoken.org/rpc', '0x90e6ca1087a2340da858069cb8d78d595e4ac798', '0x359878c13F8690710FDCb2cDB6Da1c0A92661b9E', '0x1678BbaB6Db608B27Dac2802C1d89E280b8C2C8f', '0x02Cbc51C5bbc37F93ad211a5F405aab00B0951b1', '0x0603E7fad093A88C9ADBC685808961FADDAfFF97', '0xD840b9662bf74Ae9838ccEf645E0D6d1573AA9E7', 10000, 10)`).run();
        db.prepare(`INSERT INTO configurations (mainchain, mainchainID, mainchainIDStr, mainchainRPC, wTHETAAddr, registrarOnMainchainAddr, mainchainTFuelTokenBankAddr, mainchainTNT20TokenBankAddr, mainchainTNT721TokenBankAddr, mainchainTNT1155TokenBankAddr, initialFee, crossChainTransferFeeInTFuel) VALUES ('mainnet', 361, 'mainnet', 'https://theta-bridge-wallet-partner.thetatoken.org/rpc', '0xaf537fb7e4c77c97403de94ce141b7edb9f7fcf0', '0x3255bD439c11fa45dE90F042dBF8d37D75698322', '', '', '', '', 10000, 10)`).run();

        console.log("Default configurations added");
    }

    // on first run: add default configuration //
    if (db.prepare('SELECT COUNT(*) FROM genesis').get()['COUNT(*)'] === 0) {

        db.prepare(`INSERT INTO genesis (last_state, last_update) VALUES (?, ?)`).run(-1, NOW());
    //    console.log("Default genesis added");
    }

    // on first run: add default configuration //
    if (db.prepare('SELECT COUNT(*) FROM metaconfigs').get()['COUNT(*)'] === 0) {

        db.prepare(`INSERT INTO metaconfigs (last_update) VALUES (?)`).run(NOW());
        console.log("Default configuration added");
    }

    // on first run: add default metadata //
    if (db.prepare('SELECT COUNT(*) FROM metadata').get()['COUNT(*)'] === 0) {

        db.prepare(`INSERT INTO metadata ("metadata_id") VALUES (?)`).run(1);
        console.log("Default metadata added");
    }

    // on first run: add default global //
    if (db.prepare('SELECT COUNT(*) FROM global').get()['COUNT(*)'] === 0) {

        db.prepare(`INSERT INTO global ("configuration_active") VALUES (?)`).run(1);
        console.log("Default global config added");
    }

    // on first run: add default node //
    if (db.prepare('SELECT COUNT(*) FROM nodes').get()['COUNT(*)'] === 0) {

        db.prepare(`INSERT INTO nodes ("id", "name", "type", "last_state", "last_update") VALUES (?, ?, ?, ?, ?)`).run(1, "Mainchain Walletnode [Testnet]", 1, -1, NOW());
        db.prepare(`INSERT INTO nodes ("id", "name", "type", "last_state", "last_update") VALUES (?, ?, ?, ?, ?)`).run(2, "Subchain Validator [Testnet]", 2, -1, NOW());

        //db.prepare(`INSERT INTO nodes ("name", "type", "enable", "last_update") VALUES ( ?, ?, ?, ?)`).run("Subchain Validator [Testnet]", 0, 0, now);
        console.log("Default node added");
    }

    // on first run: add default global //
    if (db.prepare('SELECT COUNT(*) FROM keyvault').get()['COUNT(*)'] === 0) {

        db.prepare(`INSERT INTO keyvault ("id", "last_state", "last_update") VALUES (?, ?, ?)`).run(1, 10, NOW());
        console.log("Default keystore added");
    }

    const fs = require('fs');
    console.log(process.cwd())
    // let subchain_governance_token_json = fs.readFileSync('contracts/SubchainGovernanceToken.json', 'utf8');

    // on first run: add default global //
    if (db.prepare('SELECT COUNT(*) FROM govtoken').get()['COUNT(*)'] === 0) {

      //  db.prepare(`INSERT INTO govtoken ("id","address", "subchain_governance_token_json", "staker_reward_per_block", "last_update") VALUES (?,?,?,?,?)`).run(1, '', String(JSON.stringify(subchain_governance_token_json)), '2000000000000000000', NOW());
      //  console.log("Default govtoken added");
    }

    // on first run: add default global //
    if (db.prepare('SELECT COUNT(*) FROM subchain').get()['COUNT(*)'] === 0) {

        // db.prepare(`INSERT INTO subchain ("subchain_name", "mainchain", "genesis_id", "govtoken_id", "admin_keystore_id", "last_state", "last_update") VALUES (?, ?, ?, ?, ?, ?, ?)`).run("My First Theta Testnet Subchain", "testnet", 1, 1, 1, -1, NOW());
        // console.log("Default subchain added");
    }

    // on first run: add default global //
    if (db.prepare('SELECT COUNT(*) FROM substake').get()['COUNT(*)'] === 0) {

        // db.prepare(`INSERT INTO substake ("mainchain", "stake_amount", "initial_investment", "validator_keystore_id", "last_state", "last_update", "enable") VALUES (?, ?, ?, ?, ?, ?, ?)`).run("testnet", '10000000000000000000000', 1, 1, -1, now, 1);
        // db.prepare(`INSERT INTO substake ("mainchain", "type", "govtoken_wei_stake_amount", "wtheta_collateral_wei_stake_amount", "tfuel_fee_wei_stake_amount", "validator_keystore_id", "admin_keystore_id", "tx_hash", "dynasty", "last_state", "last_update", "enable") VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run('testnet', "stake", '100000000000000000000000', '10000000000000000000000', '20000000000000000000000', 1, 1, '0', '0', -1, NOW(), 1);
        // console.log("Default substake added");
    }
}


const insert_default_vars = (db) => {
    types.forEach(el => {
        db.prepare('INSERT OR IGNORE INTO types (name) VALUES(?)').run(el);
    })
}


const getDb = () => {
    return open_connection();
}


module.exports = { getDb, backup, init }
