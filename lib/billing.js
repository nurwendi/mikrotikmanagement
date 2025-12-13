import { getAllActiveUsers, getPppoeProfiles } from './mikrotik.js';
import db from './db';

// Helper to format currency
const formatCurrency = (amount) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount);
};

export async function generateInvoices() {
    try {
        console.log('Starting invoice generation...');
        const [activeUsers, profiles] = await Promise.all([
            getAllActiveUsers(),
            getPppoeProfiles()
        ]);
        console.log(`Found ${activeUsers.length} active users and ${profiles.length} profiles from Mikrotik.`);

        // Create Profile Map: Name -> Price (from comment)
        const profilePriceMap = {};
        for (const p of profiles) {
            if (p.comment) {
                const match = p.comment.match(/Rp\.?\s*([\d.]+)/i);
                if (match) {
                    profilePriceMap[p.name] = parseInt(match[1].replace(/\./g, ''));
                }
            }
        }

        // Fetch all customers for mapping
        const customers = await db.customer.findMany();
        const customerMap = customers.reduce((acc, c) => {
            acc[c.username] = c;
            return acc;
        }, {});

        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let newInvoicesCount = 0;

        for (const user of activeUsers) {
            const username = user.name;
            const customer = customerMap[username];
            const profileName = user.profile; // e.g. "50Mbps"

            // Determine price
            // Priority 1: User Comment (Override)
            // Priority 2: Profile Comment (Default)
            let amount = 0;

            // Check User Comment
            if (user.comment) {
                const match = user.comment.match(/Rp\.?\s*([\d.]+)/i);
                if (match) {
                    amount = parseInt(match[1].replace(/\./g, ''));
                }
            }

            // Fallback to Profile Price
            if (amount === 0 && profileName && profilePriceMap[profileName]) {
                amount = profilePriceMap[profileName];
            }

            if (amount === 0) amount = 150000;

            // Check for existing invoice for THIS month/year
            const existingInvoice = await db.payment.findFirst({
                where: {
                    username: username,
                    month: currentMonth,
                    year: currentYear
                }
            });

            if (!existingInvoice) {
                // Check if there is a PENDING invoice from PREVIOUS month (Arrears)
                const pendingInvoice = await db.payment.findFirst({
                    where: {
                        username: username,
                        status: 'pending'
                    },
                    orderBy: { date: 'desc' }
                });

                if (pendingInvoice) {
                    // Update old invoice to merged
                    await db.payment.update({
                        where: { id: pendingInvoice.id },
                        data: { status: 'merged' }
                    });

                    // Create new cumulative invoice
                    const totalAmount = amount + pendingInvoice.amount;

                    const count = await db.payment.count();
                    const yy = String(currentYear).slice(-2);
                    const mm = String(currentMonth + 1).padStart(2, '0');
                    const custNumber = customer?.customerNumber || '0000';
                    const seq = String(count + 1).padStart(4, '0');
                    const invoiceNumber = `INV/${yy}/${mm}/${custNumber}/${seq}`;

                    await db.payment.create({
                        data: {
                            invoiceNumber,
                            username,
                            amount: totalAmount,
                            method: 'cash',
                            status: 'pending',
                            date: now,
                            month: currentMonth,
                            year: currentYear,
                            notes: `Merged invoice. Prev: ${pendingInvoice.invoiceNumber}`
                        }
                    });

                    console.log(`Merged invoice for ${username}. New total: ${totalAmount}`);
                } else {
                    // Create standard new invoice
                    const count = await db.payment.count();
                    const yy = String(currentYear).slice(-2);
                    const mm = String(currentMonth + 1).padStart(2, '0');
                    const custNumber = customer?.customerNumber || '0000';
                    const seq = String(count + 1).padStart(4, '0');
                    const invoiceNumber = `INV/${yy}/${mm}/${custNumber}/${seq}`;

                    await db.payment.create({
                        data: {
                            invoiceNumber,
                            username,
                            amount: amount,
                            method: 'cash',
                            status: 'pending',
                            date: now,
                            month: currentMonth,
                            year: currentYear,
                            notes: `Monthly Bill - ${profile}`
                        }
                    });
                    newInvoicesCount++;
                }
            }
        }

        console.log(`Generated ${newInvoicesCount} new invoices.`);
        return { success: true, count: newInvoicesCount };
    } catch (error) {
        console.error('Error generating invoices:', error);
        return { success: false, error: error.message };
    }
}
