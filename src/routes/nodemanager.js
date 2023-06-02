const express = require('express')
const nodeManager = require('../controllers/nodemanager.controller');
const router = express.Router();

router.get('/', nodeManager.get);
router.get('/add', nodeManager.add_get);
router.post('/add', nodeManager.add_post);
router.get('/edit/:id', nodeManager.edit_get);
router.post('/edit/:id', nodeManager.edit_post);

router.get('/nodes/:enable', nodeManager.enabled_nodes);
router.get('/id/:id', nodeManager.node_by_id);

router.get('/deploy/:id', nodeManager.deploy);
router.get('/start/:id', nodeManager.start);
router.get('/stop/:id', nodeManager.stop);
router.get('/reset/:id', nodeManager.reset); //stop -> deploy

router.get('/status/:id', nodeManager.status);

router.post('/testSsh', nodeManager.test_ssh)

module.exports = router;