import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(request, { params }) {
    try {
        const { id } = await params;
        const body = await request.json();
        const { status, amount, notes } = body;

        if (!status) {
            return NextResponse.json({ error: 'Status is required' }, { status: 400 });
        }

        const currentPayment = await db.payment.findUnique({
            where: { id: id },
            include: { commissions: true }
        });

        if (!currentPayment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        const updatedPayment = await db.payment.update({
            where: { id: id },
            data: {
                status: status,
                date: status === 'completed' ? new Date() : currentPayment.date,
                amount: amount !== undefined ? parseFloat(amount) : currentPayment.amount,
                notes: notes !== undefined ? notes : currentPayment.notes
            },
            include: { commissions: true }
        });

        // If postponed, create invoice for next month
        if (status === 'postponed') {
            const currentMonth = currentPayment.month;
            const currentYear = currentPayment.year;

            // Calculate next month
            let nextMonth = currentMonth + 1;
            let nextYear = currentYear;

            if (nextMonth > 11) {
                nextMonth = 0;
                nextYear++;
            }

            // Check if next month invoice already exists for this user
            const exists = await db.payment.findFirst({
                where: {
                    username: currentPayment.username,
                    month: nextMonth,
                    year: nextYear
                }
            });

            if (!exists) {
                // Generate Invoice Number
                const yy = String(nextYear).slice(-2);
                const mm = String(nextMonth + 1).padStart(2, '0');

                // Get customer number from DB or current invoice
                let custNum = '0000';
                if (currentPayment.invoiceNumber) {
                    const parts = currentPayment.invoiceNumber.split('/');
                    if (parts.length >= 4) custNum = parts[3];
                }

                // Get sequence
                // We need to count invoices for that month globally to sequence properly or just generic seq.
                // The old code used `payments.length + 2` which is unreliable.
                // Let's use count of payments for that month/year.
                const count = await db.payment.count({
                    where: { month: nextMonth, year: nextYear }
                });
                const seq = String(count + 1).padStart(4, '0');

                const newInvoiceNumber = `INV/${yy}/${mm}/${custNum}/${seq}`;

                // Ensure unique invoice number just in case
                // If it conflicts, Prisma throws. We might need retry logic or better generation.
                // For now, accept risk or use timestamp component.

                await db.payment.create({
                    data: {
                        date: new Date(),
                        status: 'pending',
                        invoiceNumber: newInvoiceNumber,
                        username: currentPayment.username,
                        amount: currentPayment.amount, // Carry over amount
                        month: nextMonth,
                        year: nextYear,
                        notes: `Tagihan bulan ${nextMonth + 1}/${nextYear} (Auto-generated from postponement)`
                    }
                });
            }
        }

        return NextResponse.json({ success: true, payment: updatedPayment });
    } catch (error) {
        console.error('Update Error:', error);
        return NextResponse.json({ error: 'Failed to update payment: ' + error.message }, { status: 500 });
    }
}
