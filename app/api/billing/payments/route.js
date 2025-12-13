import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getUserFromRequest } from '@/lib/api-auth';
import { sendPaymentReceiptEmail } from '@/lib/email';

export async function GET(request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const user = await getUserFromRequest(request);

    let where = {};

    // Filter based on role
    if (user && user.role !== 'admin') {
        const allowedUsernames = [];

        // Fetch user's assigned customers
        if (user.role === 'agent' || user.role === 'staff') {
            const agentCusts = await db.customer.findMany({
                where: { agentId: user.id },
                select: { username: true }
            });
            allowedUsernames.push(...agentCusts.map(c => c.username));
        }

        if (user.role === 'technician') {
            const techCusts = await db.customer.findMany({
                where: { technicianId: user.id },
                select: { username: true }
            });
            allowedUsernames.push(...techCusts.map(c => c.username));
        }

        // Also allow viewing own payments if user is a customer (not implemented yet, but good practice)
        if (allowedUsernames.length > 0) {
            where.username = { in: allowedUsernames };
        } else {
            // Return empty if no customers assigned
            // But wait, if role is just "viewer" what happens? 
            // Original code read all payments then filtered.
            // If user has no customers, he sees nothing.
            // If username param is provided, it must be in allowed list.
            if (!username) return NextResponse.json([]); // Strict
        }
    }

    if (username) {
        // combine with existing filtered list if any
        if (where.username && where.username.in) {
            if (where.username.in.includes(username)) {
                where.username = username;
            } else {
                return NextResponse.json([]);
            }
        } else {
            where.username = username;
        }
    }

    const payments = await db.payment.findMany({
        where,
        include: { commissions: true },
        orderBy: { date: 'desc' }
    });

    return NextResponse.json(payments);
}

export async function POST(request) {
    try {
        const body = await request.json();

        // Basic validation
        if (!body.username || !body.amount) {
            return NextResponse.json({ error: 'Username and amount are required' }, { status: 400 });
        }

        const customer = await db.customer.findUnique({ where: { username: body.username } });
        // NOTE: commissions logic requires fetching agent/tech user details.

        let commissionsData = [];
        const amount = Number(body.amount);

        if (customer) {
            if (customer.agentId) {
                const agent = await db.user.findUnique({ where: { id: customer.agentId } });
                if (agent && agent.isAgent && agent.agentRate > 0) {
                    const commissionAmount = (amount * agent.agentRate) / 100;
                    commissionsData.push({
                        userId: agent.id,
                        username: agent.username,
                        role: 'agent',
                        rate: agent.agentRate,
                        amount: commissionAmount
                    });
                }
            }

            if (customer.technicianId) {
                const technician = await db.user.findUnique({ where: { id: customer.technicianId } });
                if (technician && technician.isTechnician && technician.technicianRate > 0) {
                    const commissionAmount = (amount * technician.technicianRate) / 100;
                    commissionsData.push({
                        userId: technician.id,
                        username: technician.username,
                        role: 'technician',
                        rate: technician.technicianRate,
                        amount: commissionAmount
                    });
                }
            }
        }

        // Generate Invoice Number if not present
        let invoiceNumber = body.invoiceNumber;
        if (!invoiceNumber) {
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const custNumber = customer?.customerNumber || '0000';

            // Sequence: Needs to be unique for this Customer in this Month? Or global?
            // Original code: `String(payments.length + 1).padStart(4, '0')`. That was global sequence.
            // DB approach: Count payments for this month/year? Or just fetch last payment?
            // Let's count all payments to keep behavior roughly similar (though potentially race-conditioned).
            // Better: use count()
            const count = await db.payment.count();
            const seq = String(count + 1).padStart(4, '0');
            invoiceNumber = `INV/${yy}/${mm}/${custNumber}/${seq}`;
        }

        // Strategy: Find pending invoice
        const targetMonth = body.month !== undefined ? parseInt(body.month) : null;
        const targetYear = body.year !== undefined ? parseInt(body.year) : null;

        let existingPayment = null;

        if (targetMonth !== null && targetYear !== null) {
            existingPayment = await db.payment.findFirst({
                where: {
                    username: body.username,
                    month: targetMonth,
                    year: targetYear
                }
            });
        }

        // If not found and no month/year, find recent pending
        if (!existingPayment && targetMonth === null) {
            // Find most recent pending
            existingPayment = await db.payment.findFirst({
                where: {
                    username: body.username,
                    status: { not: 'completed' }
                },
                orderBy: { date: 'desc' }
            });
        }

        let paymentResult;

        if (existingPayment) {
            // Update
            paymentResult = await db.payment.update({
                where: { id: existingPayment.id },
                data: {
                    date: new Date(),
                    status: 'completed',
                    amount: amount,
                    method: body.method || existingPayment.method || 'cash',
                    notes: body.notes || existingPayment.notes,
                    commissions: {
                        deleteMany: {}, // replace commissions
                        create: commissionsData
                    }
                },
                include: { commissions: true }
            });
        } else {
            // Create
            paymentResult = await db.payment.create({
                data: {
                    invoiceNumber,
                    username: body.username,
                    amount: amount,
                    method: body.method || 'cash',
                    status: 'completed',
                    date: new Date(),
                    month: targetMonth !== null ? targetMonth : new Date().getMonth(),
                    year: targetYear !== null ? targetYear : new Date().getFullYear(),
                    notes: body.notes || '',
                    commissions: {
                        create: commissionsData
                    }
                },
                include: { commissions: true }
            });
        }

        // Inject Notification
        try {
            const { addNotification } = await import('@/lib/notifications-db');
            const currencyFormatter = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' });
            const notifMessage = `"System" : Payment of ${currencyFormatter.format(Number(paymentResult.amount))} for Invoice ${paymentResult.invoiceNumber} received.`;
            await addNotification(notifMessage, { username: paymentResult.username });
        } catch (notifError) {
            console.error('Failed to add payment notification:', notifError);
        }

        if (customer && customer.email) {
            try {
                await sendPaymentReceiptEmail(customer.email, {
                    invoiceNumber: paymentResult.invoiceNumber,
                    customerName: customer.name,
                    amount: paymentResult.amount,
                    date: paymentResult.date
                });
            } catch (e) {
                console.error('Failed to send receipt email:', e);
            }
        }

        return NextResponse.json({ success: true, payment: paymentResult });
    } catch (error) {
        console.error('Payment Error:', error);
        return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        const body = await request.json();
        const { ids } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
        }

        const result = await db.payment.deleteMany({
            where: { id: { in: ids } }
        });

        if (result.count === 0) {
            return NextResponse.json({ message: 'No payments found to delete' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            message: `Successfully deleted ${result.count} payments`
        });

    } catch (error) {
        console.error('Delete Error:', error);
        return NextResponse.json({ error: 'Failed to delete payments' }, { status: 500 });
    }
}

export async function PATCH(request) {
    try {
        const body = await request.json();
        const { ids, status } = body;

        if (!ids || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'IDs array is required' }, { status: 400 });
        }

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const result = await db.payment.updateMany({
            where: { id: { in: ids } },
            data: { status: status }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully updated ${result.count} payments`
        });

    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Failed to update payments' }, { status: 500 });
    }
}
