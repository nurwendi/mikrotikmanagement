import { NextResponse } from 'next/server';
import { getNotifications } from '@/lib/notifications-db';
import { cookies } from 'next/headers';
import { verifyToken } from '@/lib/security';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('auth_token')?.value;
        let logs = await getNotifications();

        // Self-healing: If logs are empty, try to sync immediately
        if (logs.length === 0) {
            console.log('Notifications empty, forcing sync...');
            const { syncNotifications } = await import('@/lib/notifications-db');
            await syncNotifications();
            logs = await getNotifications();
        }

        if (token) {
            const decoded = await verifyToken(token);
            // If user is a customer, filter logs to only show their own
            if (decoded && decoded.role === 'customer') {
                const userLogs = logs.filter(log =>
                    log.username === decoded.username ||
                    (log.message && log.message.startsWith(decoded.username + ' :'))
                );
                return NextResponse.json(userLogs);
            }
        }

        // Admins/Partners/Others see all
        return NextResponse.json(logs);
    } catch (error) {
        console.error('Error fetching notifications:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
