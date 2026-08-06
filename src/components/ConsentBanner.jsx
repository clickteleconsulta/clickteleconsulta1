import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getConsent, setConsent, initAnalytics } from '@/lib/analytics';
import { capturarAtribuicao, limparAtribuicao } from '@/lib/atribuicao';

// Banner de consentimento (LGPD): o tracking (GA4/Meta Pixel) só é carregado após "Aceitar".
const ConsentBanner = () => {
    const [visible, setVisible] = useState(false);

    useEffect(() => {
        // A captura da origem vem ANTES da decisão, e de propósito: o
        // identificador de clique só existe na URL da página de entrada, e some
        // no primeiro link que a pessoa toca. Se esperasse o banner ser
        // respondido, na metade dos casos já não haveria o que capturar.
        //
        // Guardar não é usar. Nada é enviado a lugar nenhum sem consentimento, e
        // quem RECUSA tem o dado apagado logo abaixo, no `reject`.
        capturarAtribuicao();

        const decision = getConsent();
        if (decision === 'accepted') {
            initAnalytics(); // já consentiu em visita anterior
        } else if (decision === 'rejected') {
            limparAtribuicao(); // recusou numa visita anterior: não acumula origem
        } else {
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
        limparAtribuicao(); // recusou: a origem guardada na entrada vai embora
        setVisible(false);
    };

    if (!visible) return null;

    return (
        <div className="fixed bottom-0 inset-x-0 z-[100] p-3 sm:p-4 animate-in slide-in-from-bottom-4 duration-300">
            <div className="max-w-3xl mx-auto bg-white border border-gray-200 shadow-xl rounded-lg p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Ilustração no lugar do ícone genérico de biscoito.
                        `aria-hidden`: quem usa leitor de tela já recebe o texto
                        ao lado, e descrever o desenho só acrescentaria ruído
                        antes de uma decisão que precisa ser rápida.
                        Some no celular — ali a barra disputa espaço com o
                        conteúdo e os dois botões têm prioridade sobre o enfeite. */}
                    {/* width/height = 96x96 porque o viewBox do Storyset é quadrado. Errar
                        esses dois números faz a barra pular de altura quando a imagem carrega. */}
                    <img
                        src="/ilustra/cookies.svg"
                        alt=""
                        aria-hidden="true"
                        width="96"
                        height="96"
                        className="hidden sm:block w-24 h-auto shrink-0 select-none pointer-events-none"
                    />
                    <p className="text-xs sm:text-sm text-gray-600 leading-relaxed">
                        Usamos cookies para entender como você usa o site e melhorar sua experiência. Você pode aceitar ou recusar.{' '}
                        <a href="/legal?doc=privacy_policy" target="_blank" rel="noopener noreferrer" className="text-brand-600 underline hover:text-brand-800">
                            Política de Privacidade
                        </a>.
                    </p>
                </div>
                <div className="flex gap-2 shrink-0">
                    <Button variant="outline" onClick={reject} className="h-9 text-sm rounded-md border-gray-300 text-gray-700">
                        Recusar
                    </Button>
                    <Button onClick={accept} className="h-9 text-sm rounded-md bg-primary hover:bg-primary/90 text-white shadow-md shadow-brand-500/20">
                        Aceitar
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default ConsentBanner;
