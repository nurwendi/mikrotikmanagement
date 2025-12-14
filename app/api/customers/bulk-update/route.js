import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function POST(request) {
    try {
        const user = await getUserFromRequest(request);

        // Only admin, manager, or editor can likely do this. 
        // Or maybe staff can if they are assigning to themselves?
        // For now, let's assume general permission logic handled by UI, 
        // but strict check here:
        if (!user || (user.role !== 'admin' && user.role !== 'editor')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        const body = await request.json();
        const { usernames, agentId, technicianId } = body;

        if (!usernames || !Array.isArray(usernames) || usernames.length === 0) {
            return NextResponse.json({ error: 'Usernames array is required' }, { status: 400 });
        }

        console.log(`[API] Bulk updating ${usernames.length} customers. Agent: ${agentId}, Tech: ${technicianId}`);

        // Update many not supported for upsert, so we might need a transaction or loop.
        // But since we want to CREATE customer entries if they don't exist, 'updateMany' won't work perfectly if they are missing.
        // However, usually these 'usernames' come from PPPoE users list.

        // Strategy:
        // 1. Find existing customers.
        // 2. Identify missing ones.
        // 3. Create missing ones (with minimal data).
        // 4. Update all.

        // Actually simpler: iterate and upsert. Performance hit acceptable for typical bulk size (<100).
        // OR use `updateMany` for existing and then `createMany` for missing?
        // `upsert` in a transaction is safest.

        const operations = usernames.map(username =>
            db.customer.upsert({
                where: { username },
                update: {
                    agentId: agentId === undefined ? undefined : agentId, // undefined = no change, null = remove
                    technicianId: technicianId === undefined ? undefined : technicianId
                },
                create: {
                    username,
                    agentId: agentId || null,
                    technicianId: technicianId || null
                }
            })
        );

        await db.$transaction(operations);

        return NextResponse.json({
            success: true,
            message: `Successfully updated ${usernames.length} users.`
        });

    } catch (error) {
        console.error('[API] Bulk update failed:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
