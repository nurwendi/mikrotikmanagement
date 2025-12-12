import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';
import db from '@/lib/db';

export async function GET(request) {
    try {
        const pending = await db.registration.findMany({
            where: { status: 'pending' }
        });

        // Map Prisma result to match expected frontend structure if needed
        // Frontend expects array of objects with username/details.
        // Our model flattens this.
        return NextResponse.json(pending);
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { username, action, updatedData, type, targetUsername, newValues, agentId } = body;

        // --- SUBMIT REQUEST (Register, Edit, Delete) ---
        if (type) {
            if (type === 'register') {
                // Check if user exists in User/Customer tables or pending registration
                // Note: 'username' in body is the requested new username

                const existingUser = await db.user.findUnique({ where: { username } });
                if (existingUser) {
                    return NextResponse.json({ error: "Username already exists" }, { status: 400 });
                }

                const existingReg = await db.registration.findFirst({
                    where: { username: username, status: 'pending' }
                });
                if (existingReg) {
                    return NextResponse.json({ error: "Registration for this username is already pending" }, { status: 400 });
                }

                await db.registration.create({
                    data: {
                        type: 'register',
                        status: 'pending',
                        username: username, // Requested username
                        name: body.name,
                        address: body.address,
                        phone: body.phone,
                        agentId: agentId,
                        password: body.password,
                        profile: body.profile,
                        service: body.service,
                        comment: body.comment,
                        routerIds: body.routerIds ? JSON.stringify(body.routerIds) : null
                    }
                });

                return NextResponse.json({ success: true, message: "Registration submitted for approval" });

            } else if (type === 'edit' || type === 'delete') {
                if (!targetUsername) {
                    return NextResponse.json({ error: "Target username is required" }, { status: 400 });
                }

                await db.registration.create({
                    data: {
                        type: type,
                        status: 'pending',
                        username: `req_${Date.now()}_${targetUsername}`, // Unique ID for this request
                        targetUsername: targetUsername,
                        agentId: agentId,
                        newValues: newValues ? JSON.stringify(newValues) : null,
                        name: body.name || targetUsername // For display
                    }
                });

                return NextResponse.json({ success: true, message: `${type === 'edit' ? 'Edit' : 'Delete'} request submitted for approval` });
            }
        }

        // --- APPROVE / REJECT ---
        // 'username' here matches the 'username' field in Registration model (which is the Key)
        if (!username || !action) {
            return NextResponse.json({ error: "Request ID (username) and action are required" }, { status: 400 });
        }

        const registration = await db.registration.findFirst({
            where: { username: username, status: 'pending' }
        });

        if (!registration) {
            return NextResponse.json({ error: "Request not found or not pending" }, { status: 404 });
        }

        if (action === 'reject') {
            await db.registration.update({
                where: { id: registration.id },
                data: { status: 'rejected' }
            });
            // Optionally delete? 
            // Original code: deleted from JSON. 
            // Database practice: keep history or delete. Let's delete to match behavior, or keep status.
            // Let's delete to keep list clean, or just filter by pending in GET.
            // Let's delete for now to mimic "Gone".
            await db.registration.delete({ where: { id: registration.id } });

            return NextResponse.json({ success: true, message: "Request rejected" });
        }

        if (action === 'approve') {
            const requestType = registration.type;

            if (requestType === 'register') {
                const finalData = {
                    name: registration.name,
                    address: registration.address,
                    phone: registration.phone,
                    agentId: registration.agentId,
                    username: registration.username,
                    password: registration.password,
                    profile: registration.profile,
                    service: registration.service,
                    comment: registration.comment,
                    routerIds: registration.routerIds ? JSON.parse(registration.routerIds) : []
                };

                // Merge with overrides from Admin if any
                if (updatedData) {
                    Object.assign(finalData, updatedData);
                    // If username changed in Admin update
                    if (updatedData.username && updatedData.username !== finalData.username) {
                        // Check collision
                        const exists = await db.user.findUnique({ where: { username: updatedData.username } });
                        if (exists) return NextResponse.json({ error: "New username already exists" }, { status: 400 });
                        finalData.username = updatedData.username;
                    }
                }

                // Create User in DB
                // We need to create User and Customer?
                // The current auth system uses User table.
                // The current customer system uses Customer table.
                // We typically create both. User for login, Customer for profile.

                // 1. Create User
                // Hash password
                // import bcrypt... or just raw if auth uses raw? 
                // auth.js uses bcrypt. We need to hash.
                // But wait, Mikrotik needs plaintext. We usually store hash in DB and plaintext to Mikrotik?
                // Or we store plaintext? 
                // Looking at `auth.js` -> `bcrypt.compare`.
                // Looking at `registrations` -> it sent password to Mikrotik.
                // We need `bcrypt`.

                // For simplicity in this replacement, I'll rely on the existing modules or simple logic.
                // I need to import hash from somewhere or install bcryptjs.
                // Assuming bcryptjs is available since auth.js uses it.

                // Let's skip bcrypt here to ensure I don't break with imports if not checked.
                // I will use a placeholder or plain if necessary, but correct way is hash.

                // Actually, I can use `db` but I need to `create` carefully.
                // The previous system `customer-data.json` stored everything.
                // `users.json` stored login.

                // Creating User + Customer.
                const passwordHash = require('bcryptjs').hashSync(finalData.password, 10);

                const newUser = await db.user.create({
                    data: {
                        username: finalData.username,
                        passwordHash: passwordHash,
                        role: 'viewer', // Customer default
                        fullName: finalData.name || '',
                        phone: finalData.phone || '',
                        address: finalData.address || '',
                        isAgent: false,
                        isTechnician: false
                    }
                });

                await db.customer.create({
                    data: {
                        username: finalData.username,
                        name: finalData.name || '',
                        phone: finalData.phone || '',
                        address: finalData.address || '',
                        agentId: finalData.agentId
                    }
                });

                // Create in Mikrotik
                const targetRouterIds = (finalData.routerIds && Array.isArray(finalData.routerIds) && finalData.routerIds.length > 0) ? finalData.routerIds : [null];
                const errors = [];
                let successCount = 0;

                for (const routerId of targetRouterIds) {
                    try {
                        const client = await getMikrotikClient(routerId);
                        const command = [
                            `=name=${finalData.username}`,
                            `=password=${finalData.password}`,
                            `=profile=${finalData.profile || ''}`,
                            `=service=${finalData.service || 'pppoe'}`,
                        ];
                        if (finalData.comment) command.push(`=comment=${finalData.comment}`);
                        await client.write('/ppp/secret/add', command);
                        successCount++;
                    } catch (err) {
                        console.error(`Failed to add user to router ${routerId}:`, err);
                        errors.push({ routerId, error: err.message });
                    }
                }

                if (errors.length > 0 && successCount === 0) {
                    // Rollback DB?
                    await db.user.delete({ where: { id: newUser.id } });
                    await db.customer.delete({ where: { username: finalData.username } });
                    return NextResponse.json({ error: "Failed to create user in Mikrotik", details: errors }, { status: 500 });
                }

                await db.registration.update({ where: { id: registration.id }, data: { status: 'approved' } });
                // Clean up?
                await db.registration.delete({ where: { id: registration.id } });

                return NextResponse.json({ success: true, message: "Registration approved and user created" });

            } else if (requestType === 'edit') {
                const targetUsername = registration.targetUsername;
                let newValues = registration.newValues ? JSON.parse(registration.newValues) : {};

                if (updatedData) {
                    newValues = { ...newValues, ...updatedData };
                }

                // Update Mikrotik
                try {
                    const client = await getMikrotikClient();
                    const users = await client.write('/ppp/secret/print', [`?name=${targetUsername}`]);
                    if (users.length === 0) throw new Error(`User ${targetUsername} not found in Mikrotik`);
                    const userId = users[0]['.id'];

                    const updateParams = [`=.id=${userId}`];
                    if (newValues.username && newValues.username !== targetUsername) updateParams.push(`=name=${newValues.username}`);
                    if (newValues.password) updateParams.push(`=password=${newValues.password}`);
                    if (newValues.profile) updateParams.push(`=profile=${newValues.profile}`);
                    if (newValues.service) updateParams.push(`=service=${newValues.service}`);

                    await client.write('/ppp/secret/set', updateParams);

                    // Disconnect
                    const activeConnections = await client.write('/ppp/active/print', [`?name=${targetUsername}`]);
                    for (const conn of activeConnections) {
                        await client.write('/ppp/active/remove', [`=.id=${conn['.id']}`]);
                    }

                } catch (err) {
                    return NextResponse.json({ error: "Failed to update Mikrotik: " + err.message }, { status: 500 });
                }

                // Update DB (Customer & User)
                const finalUsername = newValues.username || targetUsername;

                // If username changed, we have issues with constraints.
                // Assuming simple update for now. 
                // Prisma cascade update/delete not enabled on ID usually unless specified.
                // And we use username as ID in Customer.

                // If username changes:
                // 1. Rename User? User ID is UUID, username is field. Easy.
                // 2. Rename Customer? Customer ID IS username. Hard.
                // We might need to delete and recreate Customer or update ID (if supported).
                // Or just update non-PK fields.

                if (newValues.username && newValues.username !== targetUsername) {
                    // Check if new exists
                    const exists = await db.customer.findUnique({ where: { username: newValues.username } });
                    if (exists) return NextResponse.json({ error: "New username already exists" }, { status: 400 });

                    // Create new customer, delete old?
                    // Need to move relations too?
                    // Complex. User might accept simple updates only for now.
                    // Let's implement non-PK updates first.

                    // If username change is CRITICAL, we assume Admin handles it manually or we do full migration.
                    // For now, update User username.
                    await db.user.update({
                        where: { username: targetUsername },
                        data: { username: newValues.username }
                    });

                    // Customer table - create new, delete old
                    const oldCust = await db.customer.findUnique({ where: { username: targetUsername } });
                    await db.customer.create({
                        data: {
                            ...oldCust,
                            username: newValues.username,
                            name: newValues.name || oldCust.name,
                            address: newValues.address || oldCust.address,
                            phone: newValues.phone || oldCust.phone,
                            agentId: newValues.agentId || oldCust.agentId
                        }
                    });
                    await db.customer.delete({ where: { username: targetUsername } });
                } else {
                    // Update existing
                    await db.customer.update({
                        where: { username: targetUsername },
                        data: {
                            name: newValues.name,
                            address: newValues.address,
                            phone: newValues.phone,
                            agentId: newValues.agentId
                        }
                    });
                }

                await db.registration.delete({ where: { id: registration.id } });
                return NextResponse.json({ success: true, message: "Edit request approved and executed" });

            } else if (requestType === 'delete') {
                const targetUsername = registration.targetUsername;

                // Mikrotik
                try {
                    const client = await getMikrotikClient();
                    const users = await client.write('/ppp/secret/print', [`?name=${targetUsername}`]);
                    if (users.length > 0) {
                        await client.write('/ppp/secret/remove', [`=.id=${users[0]['.id']}`]);
                    }
                } catch (err) {
                    console.error("Failed to delete from Mikrotik:", err);
                }

                // DB
                try {
                    await db.customer.delete({ where: { username: targetUsername } });
                    await db.user.delete({ where: { username: targetUsername } });
                } catch (e) {
                    // ignore if not found
                }

                await db.registration.delete({ where: { id: registration.id } });
                return NextResponse.json({ success: true, message: "Delete request approved and executed" });
            }
        }
    } catch (error) {
        console.error('Registration action error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

