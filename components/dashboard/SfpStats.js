import { Activity, Zap, Thermometer, Radio } from 'lucide-react';
import StatCard from './StatCard';
import { colorSchemes } from './constants';

export default function SfpStats({ data }) {
    if (!data || data.length === 0) return null;

    return (
        <div className="space-y-6 mb-6">
            {data.map((sfp, index) => {
                const rx = parseFloat(sfp.rxPower || -100);

                // Determine Status Color based on Attenuation (RX Power)
                // -8 to -24 is typically good for GPON/SFP
                let statusColor = "bg-gradient-to-br from-green-500/10 to-teal-500/10 border-green-200 dark:border-green-800";
                let statusText = "Excellent";
                let iconColor = "text-green-500";

                if (rx > -10) {
                    // Too high might be overload, but usually treated as good signal in short range
                    statusColor = "bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-200 dark:border-blue-800";
                    statusText = "Strong Signal";
                    iconColor = "text-blue-500";
                } else if (rx < -27) {
                    statusColor = "bg-gradient-to-br from-red-500/10 to-pink-500/10 border-red-200 dark:border-red-800";
                    statusText = "Critical / No Link";
                    iconColor = "text-red-500";
                } else if (rx < -24) {
                    statusColor = "bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-200 dark:border-yellow-800";
                    statusText = "Weak Signal";
                    iconColor = "text-yellow-500";
                }

                return (
                    <div key={index} className={`rounded-xl border p-4 ${statusColor} transition-all duration-300`}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                                <Radio size={24} className={iconColor} />
                                {sfp.name}
                                <span className={`text-xs px-2 py-1 rounded-full border ${iconColor.replace('text', 'border')} ${iconColor.replace('text', 'bg').replace('500', '100')} ${iconColor.replace('500', '700')} dark:${iconColor.replace('500', '300')} dark:bg-opacity-20`}>
                                    {statusText}
                                </span>
                            </h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                            <StatCard
                                icon={Radio} // RX Icon
                                title="RX Power"
                                value={sfp.rxPower ? `${sfp.rxPower} dBm` : 'N/A'}
                                subtitle="Receiver Signal"
                                color={rx < -24 ? colorSchemes.orange : colorSchemes.green}
                            />
                            <StatCard
                                icon={Activity}
                                title="TX Power"
                                value={sfp.txPower ? `${sfp.txPower} dBm` : 'N/A'}
                                subtitle="Transmission"
                                color={colorSchemes.blue}
                            />

                            {sfp.voltage && (
                                <StatCard
                                    icon={Zap}
                                    title="Voltage"
                                    value={sfp.voltage.includes('V') ? sfp.voltage : `${sfp.voltage} V`}
                                    subtitle="Module Voltage"
                                    color={colorSchemes.pink}
                                />
                            )}
                            {sfp.temperature && (
                                <StatCard
                                    icon={Thermometer}
                                    title="Temperature"
                                    value={`${sfp.temperature}°C`}
                                    subtitle="Module Temp"
                                    color={parseInt(sfp.temperature) > 60 ? colorSchemes.orange : colorSchemes.purple}
                                />
                            )}
                            {sfp.wavelength && (
                                <StatCard
                                    icon={Activity} // Wave icon substitute
                                    title="Wavelength"
                                    value={`${sfp.wavelength} nm`}
                                    subtitle="Optical Wave"
                                    color={colorSchemes.cyan}
                                />
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
