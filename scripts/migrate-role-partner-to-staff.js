const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    console.log('Starting Migration: Partner -> Staff');

    // 1. Update Users
    const updateUsers = await prisma.user.updateMany({
        where: { role: 'partner' },
        data: { role: 'staff' }
    });
    console.log(`Updated ${updateUsers.count} users directly.`);

    // 2. Update Commission Roles (if stored as string)
    const updateCommissions = await prisma.commission.updateMany({
        where: { role: 'partner' },
        data: { role: 'staff' }
    });
    console.log(`Updated ${updateCommissions.count} commission records.`);

    console.log('Migration Complete.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
