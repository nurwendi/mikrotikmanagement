import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';

export async function DELETE(request, { params }) {
    try {
        const { id } = await params;

        if (!id) {
            return NextResponse.json({ error: 'Connection ID is required' }, { status: 400 });
        }

        const client = await getMikrotikClient();

        // Remove the active connection
        // Note: In RouterOS, we use the .id property to remove items
        // Use raw array syntax to handle .id correctly
        await client.write(['/ppp/active/remove', `=.id=${id}`]);

        return NextResponse.json({ success: true, message: 'Connection disconnected' });
    } catch (error) {
        console.error('Error disconnecting user:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
