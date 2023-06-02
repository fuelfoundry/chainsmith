const express = require('express')
const tokenGovManager = require('../controllers/govtoken.controller');
const router = express.Router();

router.get('/', tokenGovManager.get);
router.get('/add', tokenGovManager.add_get);
router.post('/add', tokenGovManager.add_post);
router.get('/edit/:id', tokenGovManager.edit_get);
router.post('/edit/:id', tokenGovManager.edit_post);
router.get('/govtokens/:enable', tokenGovManager.enabled_govtokens);
router.get('/id/:id', tokenGovManager.govtoken_by_id);

router.get('/deploy/:id', tokenGovManager.deploy);
router.get('/status/:id', tokenGovManager.status);

module.exports = router;

/*

4740.theta_testnet_fuelchain	(03/07/2023 07:43:01 PM)	(Detached)
~/theta/testnet_fuelchain/bin$ ./thetasubchain start --config=../validator --password=qwertyuiop

4707.theta_testnet_fuelchain_rpc	(03/07/2023 07:42:15 PM)	(Detached)
~/theta/testnet_fuelchain/bin$ ./theta-eth-rpc-adaptor start --config=../rpc

4528.theta_testnet_rpc	(03/07/2023 07:35:30 PM)	(Detached)
~/theta/testnet_mainchain/bin$ ./theta-eth-rpc-adaptor start --config=../rpc

4480.theta_testnet_mainchain	(03/07/2023 07:34:14 PM)	(Detached)
~/theta/testnet_mainchain/bin$ ./theta start --config=../node --password=qwertyuiop

 */