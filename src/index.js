const app = require('./app');
const {getDb} = require('./db/db');
// const portal = require('./portal')
// firing the DB to test if it works or not
const browserOpen = require('./utils/browserOpen');

getDb();


const exit = () => {
    if (server) {
        server.close(() => {
            console.info('Server closed');
            process.exit(1)
        })
    } else {
        process.exit(1)
    }
}

const unexpectedError = error => {
    console.error(error)
    exit()
}

process.on('uncaughtException', unexpectedError);
process.on('unhandledRejection', unexpectedError)

process.on('SIGTERM', () => {
    console.info('SIGTERM');
    if (server) {
        server.close();
    }
})

server = app.listen('3000', err => {
    if(err !== undefined) {
        console.log(err)
    }
    browserOpen('http://localhost:3000')
})
