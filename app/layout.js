import './globals.css'
import { Outfit } from 'next/font/google'
import ClientLayout from './ClientLayout';
import { ThemeProvider } from '@/contexts/ThemeContext';

const outfit = Outfit({ subsets: ['latin'] });


import fs from 'fs';
import path from 'path';

export async function generateMetadata() {
    try {
        const settingsPath = path.join(process.cwd(), 'app-settings.json');
        if (fs.existsSync(settingsPath)) {
            const data = fs.readFileSync(settingsPath, 'utf8');
            const settings = JSON.parse(data);
            return {
                title: settings.appName || 'Buroq Billing',
                description: 'Professional MikroTik PPPoE Management System',
            };
        }
    } catch (error) {
        console.error('Error reading app settings:', error);
    }
    return {
        title: 'Buroq Billing',
        description: 'Professional MikroTik PPPoE Management System',
    };
}

import { Toaster } from "@/components/ui/sonner";

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className={outfit.className}>

                <ThemeProvider>
                    <ClientLayout>
                        {children}
                    </ClientLayout>
                    <Toaster />
                </ThemeProvider>
            </body>
        </html>
    );
}
