const express = require('express')
const genesisForge = require('../controllers/genesisforge.controller');
const router = express.Router();

router.get('/', genesisForge.get);
router.get('/add', genesisForge.add_get);
router.post('/add', genesisForge.add_post);
router.get('/edit/:id', genesisForge.edit_get);
router.post('/edit/:id', genesisForge.edit_post);
router.get('/edit/:id/upload', genesisForge.upload_get);
router.post('/edit/:id/upload', genesisForge.upload_post);
router.get('/genesis/:enable', genesisForge.enabled_profiles);
router.get('/id/:id', genesisForge.genesis_by_id);
router.get('/download/snapshot/:id', genesisForge.download_snapshot);
router.get('/download/config/:id', genesisForge.download_config);
router.get('/deploy/:id', genesisForge.deploy);
router.get('/reset/:id', genesisForge.reset); //stop -> deploy
router.get('/status/:id', genesisForge.status); //stop -> deploy

module.exports = router;