import { NextResponse } from 'next/server';
import { getMikrotikClient } from '@/lib/mikrotik';

export async function GET() {
    try {
        const client = await getMikrotikClient();
        let sfpData = [];

        try {
            // Get all ethernet interfaces to check for SFP status
            // We use /interface/ethernet/print to get the list of physical ports
            const ethernetInterfaces = await client.write('/interface/ethernet/print', ['detail']);

            if (ethernetInterfaces.length > 0) {
                // Check running interfaces to avoid timeout on disconnected ports
                // Relaxed filter: check all capable interfaces that are enabled
                const candidateInterfaces = ethernetInterfaces.filter(iface => iface.disabled === 'false' && iface.running === 'true');

                // Parallelize the SFP checks
                const promises = candidateInterfaces.map(async (iface) => {
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
                                return {
                                    name: iface.name,
                                    present: stats['sfp-module-present'] === 'true',
                                    txPower: stats['sfp-tx-power'],
                                    rxPower: stats['sfp-rx-power'],
                                    temperature: stats['sfp-temperature'],
                                    voltage: stats['sfp-supply-voltage'],
                                    current: stats['sfp-bias-current'],
                                    wavelength: stats['sfp-wavelength']
                                };
                            }
                        }
                    } catch (err) {
                        // Silently fail on individual interface errors
                        // console.error(`Failed to monitor ${iface.name}:`, err.message);
                    }
                    return null;
                });

                const results = await Promise.all(promises);
                sfpData = results.filter(item => item !== null);
            }
        } catch (sfpError) {
            console.error('Error fetching SFP data:', sfpError);
        }

        return NextResponse.json({ sfpData });

    } catch (error) {
        console.error('SFP stats error:', error);
        return NextResponse.json({ sfpData: [], error: error.message }, { status: 500 });
    }
}
