const express = require('express')
const metaconfigController = require('../controllers/metaconfig.controller');

const router = express.Router();

router.get('/', metaconfigController.get);
router.get('/add', metaconfigController.add_get);
router.post('/add', metaconfigController.add_post);
router.get('/configurations/:enable', metaconfigController.enabled_configurations);
router.get('/id/:id', metaconfigController.config_by_id);
module.exports = router;
