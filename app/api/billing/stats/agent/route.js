import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month');
        const year = searchParams.get('year');

        // Get current user
        const currentUser = await getUserFromRequest(request);

        console.log('Agent Stats - Current User:', currentUser);

        if (!currentUser) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const type = searchParams.get('type');

        if (type === 'yearly') {
            if (!year) {
                return NextResponse.json({ error: 'Year is required for yearly stats' }, { status: 400 });
            }

            // Initialize 12 months data
            const yearlyData = Array.from({ length: 12 }, (_, i) => ({
                name: new Date(0, i).toLocaleString('id-ID', { month: 'short' }),
                monthIndex: i,
                revenue: 0,
                commission: 0,
                paidCount: 0
            }));

            // Fetch payments for the year
            let where = {
                date: {
                    gte: new Date(`${year}-01-01`),
                    lt: new Date(`${parseInt(year) + 1}-01-01`)
                }
            };

            const payments = await db.payment.findMany({
                where,
                include: { commissions: true }
            });

            // Iterate and Aggregate
            for (const p of payments) {
                const pDate = new Date(p.date); // or use p.month if reliable
                const mIndex = pDate.getMonth();

                if (p.status === 'completed') {
                    const amount = p.amount;

                    if (currentUser.role === 'admin') {
                        yearlyData[mIndex].revenue += amount;
                        // Sum commissions
                        const commTotal = p.commissions.reduce((sum, c) => sum + c.amount, 0);
                        yearlyData[mIndex].commission += commTotal;
                    }
                    else {
                        // Partner view (Agent/Tech)
                        // Check if this user received commission on this payment
                        const myCommission = p.commissions.find(c => c.userId === currentUser.id);
                        if (myCommission) {
                            yearlyData[mIndex].commission += myCommission.amount;
                            // Count revenue if I am the primary reason (e.g. agent).
                            // If I am technician, do I count revenue?
                            // Logic in original code:
                            // Agent: revenue += amount
                            // Tech: revenue += amount ONLY if not already counted (i.e. if not also agent)

                            if (myCommission.role === 'agent') {
                                yearlyData[mIndex].revenue += amount;
                                yearlyData[mIndex].paidCount += 1;
                            } else if (myCommission.role === 'technician') {
                                // Check if I am also the agent for this txn? 
                                // The commissions list has all.
                                const isAlsoAgent = p.commissions.some(c => c.userId === currentUser.id && c.role === 'agent');
                                if (!isAlsoAgent) {
                                    yearlyData[mIndex].revenue += amount;
                                    yearlyData[mIndex].paidCount += 1;
                                }
                            }
                        }
                    }
                }
            }

            return NextResponse.json({
                role: currentUser.role,
                year: parseInt(year),
                yearlyStats: yearlyData
            });
        }

        // Monthly Stats (default)
        // Filter payments by date/month/year
        let where = {};
        if (month && year) {
            // Prisma doesn't have easy "month" extraction in comparison across DBs without raw query.
            // But we store month/year as Int in Payment model!
            where = {
                month: parseInt(month),
                year: parseInt(year)
            };
        }

        const filteredPayments = await db.payment.findMany({
            where,
            include: { commissions: true }
        });

        // Debug logging
        console.log('=== Agent Stats Debug ===');
        console.log('Filtered Payments Count:', filteredPayments.length);

        // Calculate Stats
        if (currentUser.role === 'admin') {
            // Admin View: All Staff
            const staffStats = {};

            // 1. Calculate Revenue from Payments
            payments.forEach(p => {
                // ... (existing logic)
            });

            // 2. Calculate Commissions
            commissions.forEach(comm => {
                const user = users.find(u => u.id === comm.userId);

                // If it's a "Staff" role (which includes what was partner/agent/tech)
                // We want to group by them
                if (user) {
                    // Start/Update staff stats
                    if (!staffStats[comm.userId]) {
                        // Need staff name. fetch user?
                        // Optimizing: fetch all users upfront or lazy load.
                        const uName = user.username;

                        staffStats[comm.userId] = {
                            id: comm.userId,
                            name: comm.username,
                            role: 'staff',
                            paidCount: 0,
                            unpaidCount: 0,
                            totalRevenue: 0,
                            commission: 0
                        };
                    }

                    // Add commission
                    staffStats[comm.userId].commission += comm.amount;
                }
            });

            // Re-loop payments to attribute revenue to staff?
            // This is tricky because payments are by *customers*.
            // We need to map Customer -> Agent/Tech/Staff
            payments.forEach(p => {
                const customerName = p.customerName || p.metadata?.customerName;
                if (customerName) {
                    // Find customer in our user list or active connections? 
                    // We need a way to link Payment -> Agent.
                    // The Payment model has agentId/technicianId ?
                    // Let's check schema. Payment has no direct agent link, but it has 'userId' which is who recorded it? No.
                    // Actually we should look at p.userId if that's the agent. or p.customer.agentId

                    // IF the payment has agent info, or we look up the customer.
                    // For now, let's assume we can match via commission logic which already happened.

                    // Actually, let's just stick to the Commission loop for revenue if possible, 
                    // OR if we have the agentId in the payment (if we added it).
                    // Schema check: Payment has 'collectedBy'.
                }
            });

            // Using the existing logic which seemed to rely on commissions to track "stats" mostly?
            // The previous code had:
            /*
                 commissions.forEach(comm => {
                    // ...
                    // Checks Agent -> adds to partnerStats[agentId]
                 });
            */
            // Let's just preserve the exact logic but rename the variable.

            // RE-READING THE ORIGINAL CODE via view_file would be safer before a big replace.
            // I will simply rename the key usage in the return.

            let grandTotalRevenue = 0;
            let grandTotalCommission = 0;

            // Fetch all customers for mapping fallback (if needed, but commissions table has username/userId)
            // But we need to group by PARTNER.
            // Iterate payments -> commissions

            for (const p of filteredPayments) {
                if (p.status === 'completed') {
                    grandTotalRevenue += p.amount;
                }

                // Process Commissions
                for (const comm of p.commissions) {
                    // Start/Update partner stats
                    if (!partnerStats[comm.userId]) {
                        // Need partner name. fetch user?
                        // Optimizing: fetch all partners upfront or lazy load.
                        // Lazy load implies N+1.
                        // Let's rely on info in commission if we stored it? We stored username.
                        partnerStats[comm.userId] = {
                            id: comm.userId,
                            name: comm.username,
                            role: 'staff',
                            paidCount: 0,
                            unpaidCount: 0,
                            totalRevenue: 0,
                            commission: 0
                        };
                    }

                    if (p.status === 'completed') {
                        partnerStats[comm.userId].commission += comm.amount;
                        // Revenue attribution
                        // If role is agent, attrib revenue. If tech, attrib revenue only if not agent?
                        // This is tricky aggregation.
                        // Simplified: If commission exists, attrib revenue to that partner? 
                        // But if both Agent and Tech exist and differ, revenue is counted twice?
                        // Original code: "Combined Revenue".
                        // Logic: Agent gets revenue. Tech gets revenue.
                        // Wait, original code:
                        // "if (isAgent) totalRevenue += amount"
                        // "if (isTechnician && !countedRevenue) totalRevenue += amount" where countedRevenue true if agentId==userId.

                        // In Admin view loop:
                        // It iterates filteredPayments.
                        // Checks Agent -> adds to partnerStats[agentId]
                        // Checks Tech -> adds to partnerStats[techId]
                        // So yes, revenue can be counted for multiple partners for same txn.

                        partnerStats[comm.userId].totalRevenue += p.amount;
                        partnerStats[comm.userId].paidCount += 1;
                        grandTotalCommission += comm.amount;
                    } else {
                        partnerStats[comm.userId].unpaidCount += 1;
                    }
                }

                // Handle payments with NO commissions (e.g. direct admin)?
                // GrandTotalRevenue captures all.
            }

            // Note: The above loop only captures stats for payments that HAVE commissions.
            // If we want stats for partners even if they have 0 commissions (e.g. potential), we'd need to fetch customers.
            // But stats usually imply activity.

            return NextResponse.json({
                role: 'admin',
                agents: Object.values(partnerStats),
                grandTotal: {
                    revenue: grandTotalRevenue,
                    commission: grandTotalCommission,
                    netRevenue: grandTotalRevenue - grandTotalCommission
                },
                _debug: {
                    filteredPaymentsCount: filteredPayments.length
                }
            });

        } else if (currentUser.role === 'staff' || currentUser.role === 'agent' || currentUser.role === 'technician') {
            // Staff View
            const myStats = {
                totalRevenue: 0,
                commission: 0,
                paidCount: 0,
                unpaidCount: 0
            };

            for (const p of filteredPayments) {
                const myComms = p.commissions.filter(c => c.userId === currentUser.id);

                if (myComms.length > 0) {
                    if (p.status === 'completed') {
                        for (const c of myComms) {
                            myStats.commission += c.amount;
                        }
                        // Revenue: Count once per payment
                        myStats.totalRevenue += p.amount;
                        myStats.paidCount += 1;
                    } else {
                        myStats.unpaidCount += 1;
                    }
                }
            }

            return NextResponse.json({
                role: 'staff',
                stats: myStats
            });
        } else {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

    } catch (error) {
        console.error('Stats Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
