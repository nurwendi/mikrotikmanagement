import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, newPassword } = body;

        if (!username || !newPassword) {
            return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
        }

        if (newPassword.length < 4) {
            return NextResponse.json({ error: 'Password must be at least 4 characters' }, { status: 400 });
        }

        // Find user
        const user = await db.user.findUnique({
            where: { username }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Hash password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update user
        await db.user.update({
            where: { username },
            data: { passwordHash }
        });

        return NextResponse.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
        console.error('Password change error:', error);
        return NextResponse.json({ error: 'Failed to change password' }, { status: 500 });
    }
}
