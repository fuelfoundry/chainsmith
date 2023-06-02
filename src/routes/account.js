const express = require('express')
const accountManager = require('../controllers/account.controller');
const router = express.Router();

router.get('/', accountManager.get);
//router.get('/add', accountManager.add_get);
//router.post('/add', accountManager.add_post);
router.get('/edit/:id', accountManager.edit_get);
router.post('/edit/:id', accountManager.edit_post);
router.get('/accounts/:enable', accountManager.enabled_accounts);
router.get('/tools/privatenet/mintmocktheta/:id', accountManager.tools_privatenet_mintmocktheta);
router.get('/id/:id', accountManager.account_by_id);

module.exports = router;