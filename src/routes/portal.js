const express = require('express')
const portalController = require('../controllers/portal.controller');
const router = express.Router();

router.get('/', portalController.get);

module.exports = router;
