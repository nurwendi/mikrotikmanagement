import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';

export async function GET() {
    try {
        const client = await getMikrotikClient();

        // Fetch PPPoE active connections
        const activeConnections = await client.write('/ppp/active/print');

        // Fetch all PPPoE secrets (users)
        const allUsers = await client.write('/ppp/secret/print');

        // Fetch system resources
        const resources = await client.write('/system/resource/print');
        const resource = resources[0] || {};

        // Fetch CPU temperature and Voltage
        let temperature = null;
        let voltage = null;
        try {
            const health = await client.write('/system/health/print');

            // Check for various temperature sensor names
            const tempItem = health.find(h =>
                h.name === 'temperature' ||
                h.name === 'cpu-temperature' ||
                h.name === 'board-temperature'
            );

            // Check for voltage
            const voltageItem = health.find(h =>
                h.name === 'voltage' ||
                h.name === 'monitor-voltage'
            );

            if (tempItem) {
                temperature = parseInt(tempItem.value);
            }
            if (voltageItem) {
                voltage = parseFloat(voltageItem.value);
            }
        } catch (e) {
            // Health not available on all Mikrotik devices
        }

        // Fetch interface statistics
        const interfaces = await client.write('/interface/print', ['=stats']);
        const interfaceStats = interfaces
            .filter(iface => {
                // Exclude PPPoE client interfaces (pppoe-out)
                const name = iface.name || '';
                return !name.startsWith('pppoe-out') && !name.startsWith('<pppoe-');
            })
            .map(iface => ({
                name: iface.name,
                type: iface.type,
                running: iface.running === 'true',
                txRate: parseInt(iface['tx-bits-per-second'] || 0),
                rxRate: parseInt(iface['rx-bits-per-second'] || 0),
                txBytes: parseInt(iface['tx-byte'] || 0),
                rxBytes: parseInt(iface['rx-byte'] || 0)
            }));

        // Calculate stats
        const pppoeActive = activeConnections.length;
        const pppoeOffline = allUsers.length - pppoeActive;
        const cpuLoad = parseInt(resource['cpu-load'] || 0);
        const memoryUsed = parseInt(resource['free-memory'] || 0);
        const memoryTotal = parseInt(resource['total-memory'] || 0);

        // Fetch SFP Data
        let sfpData = [];

        try {
            // Get all ethernet interfaces to check for SFP status
            // We use /interface/ethernet/print to get the list of physical ports
            const ethernetInterfaces = await client.write('/interface/ethernet/print', ['detail']);

            if (ethernetInterfaces.length > 0) {
                // Check running interfaces to avoid timeout on disconnected ports
                // Relaxed filter: check all capable interfaces that are enabled
                const candidateInterfaces = ethernetInterfaces.filter(iface => iface.disabled === 'false' && iface.running === 'true');

                for (const iface of candidateInterfaces) {
                    try {
                        // Use raw array syntax to bypass library parameter wrapping issues
                        const monitorData = await client.write([
                            '/interface/ethernet/monitor',
                            `=numbers=${iface['.id'] || iface.name}`,
                            '=once='
                        ]);

                        if (monitorData && monitorData[0]) {
                            const stats = monitorData[0];

                            // Check for ANY SFP indicator. 
                            const hasSfpKeys = Object.keys(stats).some(k => k.startsWith('sfp-'));
                            const hasReadings = stats['sfp-rx-power'] || stats['sfp-tx-power'];

                            if (hasSfpKeys || hasReadings) {
                                sfpData.push({
                                    name: iface.name,
                                    present: stats['sfp-module-present'] === 'true',
                                    txPower: stats['sfp-tx-power'],
                                    rxPower: stats['sfp-rx-power'],
                                    temperature: stats['sfp-temperature'],
                                    voltage: stats['sfp-supply-voltage'],
                                    current: stats['sfp-bias-current'],
                                    wavelength: stats['sfp-wavelength']
                                });
                            }
                        }
                    } catch (err) {
                        // Silently fail on individual interface errors
                        console.error(`Failed to monitor ${iface.name}:`, err.message);
                    }
                }
            }
        } catch (sfpError) {
            console.error('Error fetching SFP data:', sfpError);
        }

        return NextResponse.json({
            pppoeActive,
            pppoeOffline,
            cpuLoad,
            memoryUsed: memoryTotal - memoryUsed,
            memoryTotal,
            temperature,
            temperature,
            voltage,
            sfpData, // Include SFP data
            interfaces: interfaceStats // Show all interfaces
        });
    } catch (error) {
        console.error('Dashboard stats error:', error);
        return NextResponse.json({
            error: error.message,
            pppoeActive: 0,
            pppoeOffline: 0,
            cpuLoad: 0,
            memoryUsed: 0,
            memoryTotal: 0,
            temperature: null,
            interfaces: []
        }, { status: 500 });
    }
}
