const express = require('express')
const keyStore = require('../controllers/keystore.controller');

const router = express.Router();

router.get('/', keyStore.get);
router.get('/add', keyStore.add);
router.post('/add', keyStore.add_post);
router.get('/edit/:id', keyStore.edit_get);
router.post('/edit/:id', keyStore.edit_post);
router.get('/keystores/:enable', keyStore.enabled_keystores);
router.get('/id/:id', keyStore.keystore_by_id);

module.exports = router;