const express = require('express');
const portalRouter = require('./portal');
const keyStoreRouter = require('./keystore');
const nodeManagerRouter = require('./nodemanager');
const subchainRouter = require('./subchain');
const substakeRouter = require('./substake');
const tokenGovRouter = require('./govtoken');
const metaConfigRouter = require('./metaconfig');
const genesisForgeRouter = require('./genesisforge');
const accountRouter = require('./account');
const indexController = require('../controllers/index.controller.js');

const router = express.Router();

const routes = [
    {
        path: '/portal',
        router: portalRouter
    },
    {
        path: '/keystore',
        router: keyStoreRouter
    },
    {
        path: '/nodemanager',
        router: nodeManagerRouter
    },
    {
        path: '/genesisforge',
        router: genesisForgeRouter
    },
    {
        path: '/govtoken',
        router: tokenGovRouter
    },
    {
        path: '/metaconfig',
        router: metaConfigRouter
    },
    {
        path: '/subchain',
        router: subchainRouter
    },
    {
        path: '/substake',
        router: substakeRouter
    },
    {
        path: '/account',
        router: accountRouter
    }

]

routes.forEach(r => {
    router.use(r.path, r.router);
});

//adding the '/' listener, please use the way from above for all the other routes

router.get("/", indexController.get);
router.post("/", indexController.post);
router.get("/logout", indexController.logout);

module.exports = router;
