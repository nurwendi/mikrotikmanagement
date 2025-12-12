import db from './db';

export const getConfig = async () => {
    try {
        const setting = await db.systemSetting.findUnique({
            where: { key: 'mikrotik_config' }
        });

        if (setting) {
            const config = JSON.parse(setting.value);
            // Ensure legacy structure support
            if (!config.connections) config.connections = [];
            return config;
        }
    } catch (error) {
        console.error('Error reading config:', error);
    }
    return { connections: [], activeConnectionId: null };
};

export const saveConfig = async (config) => {
    try {
        await db.systemSetting.upsert({
            where: { key: 'mikrotik_config' },
            update: { value: JSON.stringify(config) },
            create: { key: 'mikrotik_config', value: JSON.stringify(config) }
        });

        // Also update file for backup/fallback? No, source of truth is DB now.
        // We might want to delete the file later.
        return true;
    } catch (error) {
        console.error('Error saving config:', error);
        return false;
    }
};

