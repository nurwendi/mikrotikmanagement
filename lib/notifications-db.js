import db from './db';
import { getMikrotikClient } from './mikrotik.js';

export async function getNotifications() {
    try {
        const notifications = await db.notification.findMany({
            orderBy: { createdAt: 'desc' }, // or sort by 'time' if possible, but createdAt is safer
            take: 100
        });
        return notifications;
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return [];
    }
}

export async function saveNotifications(notifications) {
    // Deprecated in favor of DB inserts in sync function
    return true;
}

export async function addNotification(message, options = {}) {
    // Helper for manually inserting notifications
    try {
        await db.notification.create({
            data: {
                message: message,
                username: options.username || null,
                time: new Date().toISOString(), // Use current time
                status: 'info'
            }
        });
    } catch (e) {
        console.error('Error adding notification:', e);
    }
}

export async function syncNotifications() {
    try {
        const client = await getMikrotikClient();

        // Fetch logs (get enough to cover recent events)
        const logs = await client.write('/log/print', []);

        // Filter and process Mikrotik logs
        const newLogs = logs
            .reverse() // Newest first
            .map(log => {
                const message = log.message;
                // STRICT Regex for <pppoe-user>: connected/disconnected
                const pppoeMatch = message.match(/^<pppoe-(.+?)>:\s*(connected|disconnected)$/);

                if (!pppoeMatch) return null;

                const username = pppoeMatch[1];
                const status = pppoeMatch[2];
                // Format clean message for display/legacy
                const cleanMessage = `${username} : ${status}`;

                return {
                    mikrotikId: log['.id'],
                    time: log.time,
                    message: cleanMessage,
                    username: username,
                    status: status
                };
            })
            .filter(item => item !== null);

        let count = 0;
        for (const log of newLogs) {
            // Check if exists using mikrotikId if available, or signature
            // Here we use mikrotikId + time as composite check or just rely on 'mikrotikId' if it's unique enough (it resets on reboot)
            // Better: check if recent notification with same message/time exists.

            // Simple fallback: Check if mikrotikId AND time matches within last 100 entries? 
            // Or assume mikrotikId is consistent for current session.

            try {
                const exists = await db.notification.findFirst({
                    where: {
                        mikrotikId: log.mikrotikId,
                        time: log.time,
                        message: log.message
                    }
                });

                if (!exists) {
                    await db.notification.create({
                        data: {
                            mikrotikId: log.mikrotikId,
                            time: log.time,
                            message: log.message,
                            username: log.username,
                            status: log.status
                        }
                    });
                    count++;
                }
            } catch (e) {
                // ignore
            }
        }

        if (count > 0) {
            console.log(`[Sync] Synced ${count} new notifications.`);
        }
        return count;

    } catch (error) {
        console.error('Error syncing notifications:', error);
        return 0;
    }
}
