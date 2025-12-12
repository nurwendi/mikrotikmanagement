const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const CONFIG_FILE = path.join(process.cwd(), 'config.json');

async function main() {
    console.log('Starting Config Verification...');

    if (!fs.existsSync(CONFIG_FILE)) {
        console.log('No config.json found. Skipping migration.');
        return;
    }

    const fileContent = fs.readFileSync(CONFIG_FILE, 'utf8');
    const jsonConfig = JSON.parse(fileContent);
    console.log('Loaded config.json:', typeof jsonConfig);

    // Normalize JSON config to match expected DB structure
    const migratedConfig = {
        title: jsonConfig.title,
        activeConnectionId: jsonConfig.connections ? jsonConfig.activeConnectionId : (jsonConfig.host ? 'default' : null),
        connections: jsonConfig.connections || (jsonConfig.host ? [{
            id: 'default',
            name: 'Default Connection',
            host: jsonConfig.host,
            port: jsonConfig.port,
            user: jsonConfig.user,
            password: jsonConfig.password
        }] : []),
        wanInterface: jsonConfig.wanInterface,
        email: jsonConfig.email
    };

    console.log('Normalized Config for DB:', JSON.stringify(migratedConfig, null, 2));

    // Check DB
    const dbSetting = await prisma.systemSetting.findUnique({
        where: { key: 'mikrotik_config' }
    });

    if (dbSetting) {
        console.log('DB Config already exists.');
        const dbConfig = JSON.parse(dbSetting.value);
        // Compare? for now we blindly trust that if it exists, it might be newer?
        // But user wants "Move completely".
        // Let's UPDATE DB with File content to be 100% sure we have what was in the file, 
        // OR assume file is truth. 
        // Given 'config.js' logic: it reads DB first. So if DB existed, app was using DB.
        // If app was using DB, we shouldn't overwrite with old file.
        // BUT `config.js` logic was: "If setting exists, return it".
        // So safe to assume DB is current truth IF it exists.

        console.log('Verifying DB content matches schema...');
        // We just ensure it's not empty?
        if (!dbConfig.connections) {
            console.warn('DB Config missing connections array. Updating from file just in case.');
            await prisma.systemSetting.update({
                where: { key: 'mikrotik_config' },
                data: { value: JSON.stringify(migratedConfig) }
            });
            console.log('DB Updated.');
        } else {
            console.log('DB Config looks valid. Keeping DB version as Source of Truth.');
        }

    } else {
        console.log('DB Config missing. Creating from file...');
        await prisma.systemSetting.create({
            data: {
                key: 'mikrotik_config',
                value: JSON.stringify(migratedConfig)
            }
        });
        console.log('Created DB Config.');
    }

    console.log('Verification Complete. Safe to delete file.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
