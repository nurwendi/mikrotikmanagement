import { NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-auth';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const user = getUserFromRequest(request);
        let where = {};

        if (user) {
            if (user.role === 'agent') {
                where.agentId = user.id;
            } else if (user.role === 'technician') {
                where.technicianId = user.id;
            }
        }

        const customersList = await db.customer.findMany({
            where,
            include: {
                agent: { select: { username: true, id: true } },
                technician: { select: { username: true, id: true } }
            }
        });

        // Convert array to object to maintain API compatibility
        const customers = customersList.reduce((acc, curr) => {
            acc[curr.username] = curr;
            return acc;
        }, {});

        return NextResponse.json(customers);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, name, address, phone, email, customerNumber } = body;

        console.log(`[API] Updating customer data for username: ${username}`, body);

        if (!username) {
            return NextResponse.json({ error: 'Username is required' }, { status: 400 });
        }

        let agentId = body.agentId;
        let technicianId = body.technicianId;

        // Auto-assign if creator is restricted and IDs are not provided
        const user = getUserFromRequest(request);
        if (user) {
            if (user.isAgent && !agentId) agentId = user.id;
            if (user.isTechnician && !technicianId) technicianId = user.id;
        }

        // Verify agent/tech existence if IDs provided
        if (agentId) {
            const agent = await db.user.findUnique({ where: { id: agentId } });
            if (!agent) agentId = null;
        }
        if (technicianId) {
            const tech = await db.user.findUnique({ where: { id: technicianId } });
            if (!tech) technicianId = null;
        }

        // Handle Customer Number Auto-generation
        let finalCustomerNumber = customerNumber;

        // If not provided, check if exists in DB or generate
        if (!finalCustomerNumber) {
            const existing = await db.customer.findUnique({ where: { username } });
            if (existing && existing.customerNumber) {
                finalCustomerNumber = existing.customerNumber;
            } else {
                // Generate new
                // Find max customer number. This is inefficient in SQL without tracking.
                // We'll fetch all customer numbers and find max. 
                // Optimization: Store a sequence or just find max via raw query or standard findMany ordering?
                // Since customerNumber is string, sorting might be tricky if lengths differ.
                // Falling back to "fetch all and parse" logic as in original code, but only customerNumber field.
                const allCusts = await db.customer.findMany({ select: { customerNumber: true } });
                let maxId = 10000;
                for (const c of allCusts) {
                    if (c.customerNumber) {
                        const numPart = parseInt(c.customerNumber);
                        if (!isNaN(numPart) && numPart > maxId) {
                            maxId = numPart;
                        }
                    }
                }
                finalCustomerNumber = String(maxId + 1);
            }
        }

        const customer = await db.customer.upsert({
            where: { username },
            update: {
                name: name || undefined, // undefined means do not update
                address: address || undefined,
                phone: phone || undefined,
                email: email || undefined,
                customerNumber: finalCustomerNumber,
                agentId: agentId,
                technicianId: technicianId,
            },
            create: {
                username,
                name: name || '',
                address: address || '',
                phone: phone || '',
                email: email || '',
                customerNumber: finalCustomerNumber,
                agentId: agentId,
                technicianId: technicianId,
            }
        });

        console.log(`[API] Customer data saved for ${username}`);

        return NextResponse.json({ success: true, customer });
    } catch (error) {
        console.error('[API] Error saving customer data:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
