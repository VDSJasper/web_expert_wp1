const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const CONFIG_PATH = path.join(__dirname, 'config.yaml');

const config = yaml.load(fs.readFileSync(CONFIG_PATH, 'utf8')) || {};

function saveConfig() {
    const tmpPath = CONFIG_PATH + '.tmp';
    fs.writeFileSync(tmpPath, yaml.dump(config, { noRefs: true }));
    fs.renameSync(tmpPath, CONFIG_PATH);
}

module.exports = { config, saveConfig };