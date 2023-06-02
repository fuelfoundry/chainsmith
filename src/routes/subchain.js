const express = require('express')
const subchain = require('../controllers/subchain.controller');
const tokenGovManager = require("../controllers/govtoken.controller");

const router = express.Router();

router.get('/', subchain.get);
router.get('/add', subchain.add_get);
router.post('/add', subchain.add_post);
router.get('/edit/:id', subchain.edit_get);
router.post('/edit/:id', subchain.edit_post);
router.get('/subchains/:enable', subchain.enabled_subchains);
router.get('/id/:id', subchain.subchain_by_id);

router.get('/deploy/:id', subchain.deploy);
router.get('/status/:id', subchain.status);

module.exports = router;