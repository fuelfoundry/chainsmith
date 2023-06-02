const express = require('express')
const substake = require('../controllers/substake.controller');
const router = express.Router();

router.get('/', substake.get);
router.get('/add', substake.add_get);
router.post('/add', substake.add_post);
router.get('/edit/:id', substake.edit_get);
router.post('/edit/:id', substake.edit_post);
router.get('/substakes/:enable', substake.enabled_substakes);
router.get('/id/:id', substake.substake_by_id);

router.get('/deploy/:id', substake.deploy);
router.get('/status/:id', substake.status);

module.exports = router;