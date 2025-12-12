'use client';

import { useState, useEffect } from 'react';
import { WifiOff, Phone, AlertTriangle, Loader2 } from 'lucide-react';
import Image from 'next/image';

export default function IsolirPage() {
    const [contact, setContact] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/isolir/contact')
            .then(res => res.json())
            .then(data => {
                setContact(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch contact", err);
                setLoading(false);
            });
    }, []);

    const whatsappLink = contact?.phone
        ? `https://wa.me/${contact.phone}`
        : 'https://wa.me/628123456789';

    const contactLabel = contact?.name ? contact.name : 'Admin';

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full overflow-hidden border-t-4 border-red-600">
                <div className="p-8 text-center">
                    <div className="flex justify-center mb-6">
                        <Image src="/logo.png" alt="Logo" width={100} height={100} className="h-20 w-auto object-contain" priority />
                    </div>
                    <div className="bg-red-100 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                        <WifiOff size={48} className="text-red-600" />
                    </div>

                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Layanan Terisolir</h1>
                    <p className="text-gray-600 mb-6">
                        Maaf, layanan internet Anda saat ini dinonaktifkan sementara karena ada tagihan yang belum terselesaikan.
                    </p>

                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6 text-left">
                        <div className="flex items-start gap-3">
                            <AlertTriangle className="text-orange-500 shrink-0 mt-0.5" size={20} />
                            <div>
                                <h3 className="font-semibold text-orange-800 text-sm">Penting</h3>
                                <p className="text-xs text-orange-700 mt-1">
                                    Mohon segera lakukan pembayaran untuk mengaktifkan kembali layanan internet Anda secara otomatis.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-green-700 transition-colors"
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : <Phone size={20} />}
                            {loading ? 'Memuat Kontak...' : `Hubungi ${contactLabel} via WhatsApp`}
                        </a>

                        <p className="text-xs text-gray-500 mt-4">
                            Jika Anda sudah melakukan pembayaran namun halaman ini masih muncul, silakan restart modem/router Anda.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
