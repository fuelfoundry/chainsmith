const {exec} = require('child_process');
const browserOpen = (url) => {
    const os = process.platform;
    let command;
    if (os === 'win32') {
        command = "explorer";
    }

    if (os === "darwin") {
        command = "open";
    }

    if (os === "linux") {
        command = "xdg-open";
    }

    exec(`${command} ${url}`);
}

module.exports = browserOpen;
