import React from 'react';
import { BRAND } from '@/config/brand';
import { Helmet } from 'react-helmet';
import { Mail, Phone, MessageSquare } from '@/components/ui/icones';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
const SupportPage = () => {
  return <>
            <Helmet>
                <title>{`Suporte · ${BRAND.name}`}</title>
            </Helmet>
            <div className="max-w-3xl mx-auto">
                {/* Título à esquerda, arte à direita. Aqui ela é MAIOR que nas
                    outras páginas de propósito: suporte é a tela onde a pessoa
                    chega tensa, e a ilustração faz o trabalho de baixar o tom —
                    nas demais ela é apoio, não protagonista. */}
                <div className="grid md:grid-cols-[minmax(0,1fr)_auto] md:items-center gap-8 mb-12">
                    <div className="text-center md:text-left">
                        <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl">Precisa de Ajuda?</h1>
                        <p className="mt-4 text-lg text-muted-foreground">Estamos aqui para te ajudar. Escolha a melhor forma de contato para você.</p>
                    </div>
                    <img
                        src="/ilustra/suporte.svg"
                        alt=""
                        aria-hidden="true"
                        className="hidden md:block w-[240px] h-auto select-none pointer-events-none"
                    />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="text-primary" /> E-mail
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Envie-nos um e-mail com sua dúvida ou problema. Responderemos o mais breve possível.</p>
                            <a href={`mailto:${BRAND.emails.suporte}`} className="font-semibold text-primary mt-2 block">Email</a>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <MessageSquare className="text-primary" /> WhatsApp
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground">Fale conosco pelo nosso WhatsApp:</p>
                            <a href="https://wa.me/5521998902451" target="_blank" rel="noopener noreferrer" className="font-semibold text-primary mt-2 block">(21) 99890-2451</a>
                        </CardContent>
                    </Card>
                </div>

                <div className="mt-12 text-center">
                    <h2 className="text-2xl font-bold">Horário de Atendimento</h2>
                    <p className="text-muted-foreground mt-2">Segunda a Sexta, das 08:00 às 18:00.</p>
                </div>
            </div>
        </>;
};
export default SupportPage;