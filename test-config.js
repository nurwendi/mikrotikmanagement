const { getConfig } = require('./lib/config');

async function test() {
    console.log('Testing getConfig...');
    const config = await getConfig();
    console.log('Config Result:', JSON.stringify(config, null, 2));
}

test();
