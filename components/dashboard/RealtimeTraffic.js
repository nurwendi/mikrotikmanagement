'use client';

import { Activity, ArrowUp, ArrowDown } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RealtimeTraffic({ realtimeTraffic, formatBitsPerSecond, formatBytes }) {
    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { duration: 0.5, ease: "easeOut" }
        }
    };

    return (
        <motion.div variants={itemVariants}>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <div className="p-2 bg-gradient-to-br from-purple-100 to-fuchsia-50 dark:from-purple-900/30 dark:to-fuchsia-900/20 rounded-lg shadow-lg shadow-purple-500/20 text-purple-600 dark:text-purple-400">
                    <Activity size={20} />
                </div>
                Real-time Internet Traffic
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white/30 dark:bg-green-900/20 backdrop-blur-xl border border-white/20 dark:border-green-500/20 rounded-2xl shadow-xl shadow-green-500/5 p-6 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                        <ArrowDown size={64} className="text-green-500 dark:text-green-400" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent dark:from-green-500/20 pointer-events-none" />

                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <span className="text-green-700 dark:text-green-400 text-sm font-medium">Download Speed</span>
                        <ArrowDown size={20} className="text-green-600 dark:text-green-400" />
                    </div>
                    <p className="text-3xl font-bold relative z-10 text-green-700 dark:text-green-300">
                        {formatBitsPerSecond(realtimeTraffic.downloadRate)}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/30 dark:bg-blue-900/20 backdrop-blur-xl border border-white/20 dark:border-blue-500/20 rounded-2xl shadow-xl shadow-blue-500/5 p-6 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                        <ArrowUp size={64} className="text-blue-500 dark:text-blue-400" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent dark:from-blue-500/20 pointer-events-none" />

                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <span className="text-blue-700 dark:text-blue-400 text-sm font-medium">Upload Speed</span>
                        <ArrowUp size={20} className="text-blue-600 dark:text-blue-400" />
                    </div>
                    <p className="text-3xl font-bold relative z-10 text-blue-700 dark:text-blue-300">
                        {formatBitsPerSecond(realtimeTraffic.uploadRate)}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="bg-white/30 dark:bg-emerald-900/20 backdrop-blur-xl border border-white/20 dark:border-emerald-500/20 rounded-2xl shadow-xl shadow-emerald-500/5 p-6 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                        <ArrowDown size={64} className="text-emerald-500 dark:text-emerald-400" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-transparent dark:from-emerald-500/20 pointer-events-none" />

                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <span className="text-emerald-700 dark:text-emerald-400 text-sm font-medium">Total Download</span>
                        <ArrowDown size={20} className="text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <p className="text-3xl font-bold relative z-10 text-emerald-700 dark:text-emerald-300">
                        {formatBytes(realtimeTraffic.downloadBytes)}
                    </p>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-white/30 dark:bg-indigo-900/20 backdrop-blur-xl border border-white/20 dark:border-indigo-500/20 rounded-2xl shadow-xl shadow-indigo-500/5 p-6 relative overflow-hidden group"
                >
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
                        <ArrowUp size={64} className="text-indigo-500 dark:text-indigo-400" />
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent dark:from-indigo-500/20 pointer-events-none" />

                    <div className="flex items-center justify-between mb-2 relative z-10">
                        <span className="text-indigo-700 dark:text-indigo-400 text-sm font-medium">Total Upload</span>
                        <ArrowUp size={20} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="text-3xl font-bold relative z-10 text-indigo-700 dark:text-indigo-300">
                        {formatBytes(realtimeTraffic.uploadBytes)}
                    </p>
                </motion.div>
            </div>
        </motion.div>
    );
}
