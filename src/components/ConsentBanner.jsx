import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';
import { getConsent, setConsent, initAnalytics } from '@/lib/analytics';

// Banner de consentimento (LGPD): o tracking (GA4/Meta Pixel) só é carregado após "Aceitar".
const ConsentBanner = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        const decision = getConsent();
        if (decision === 'accepted') {
            initAnalytics(); // já consentiu em visita anterior
        } else if (!decision) {
            setVisible(true); // ainda não decidiu
        }
    }, []);

    const accept = () => {
        setConsent('accepted');
        initAnalytics();
        setVisible(false);
    };

    const reject = () => {
        setConsent('rejected');
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="max-w-3xl mx-auto bg-white border border-gray-200 shadow-xl rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
                        <Cookie className="w-5 h-5" />
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Usamos cookies para entender como você usa o site e melhorar sua experiência. Você pode aceitar ou recusar.{' '}
                        <a href="/legal?doc=privacy_policy" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                            Política de Privacidade
                        </a>.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={reject} className="h-9 text-sm rounded-xl border-gray-300 text-gray-700">
                        Recusar
                    </Button>
                    <Button onClick={accept} className="h-9 text-sm rounded-xl bg-primary hover:bg-primary/90 text-white shadow-md shadow-blue-500/20">
                        Aceitar
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConsentBanner;
