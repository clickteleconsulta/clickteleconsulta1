import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera, Mic, Wifi, Globe, CheckCircle2, XCircle, Loader2,
  AlertTriangle, ArrowRight, SkipForward, RefreshCw, Info
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

/**
 * PreConsultaCheck — Verificação técnica pré-consulta
 * Referência: Teladoc (system check), Google Meet (permissions check)
 *
 * Props:
 *   open {boolean} — controla abertura do modal
 *   onOpenChange {function} — callback de fechar
 *   onReady {function} — callback quando todos os checks passam
 *   isDoctor {boolean} — médicos podem pular verificação
 */

const CHECK_STEPS = [
  { id: 'camera', label: 'Câmera', icon: Camera, description: 'Verificando acesso à câmera...' },
  { id: 'microphone', label: 'Microfone', icon: Mic, description: 'Verificando acesso ao microfone...' },
  { id: 'connection', label: 'Conexão', icon: Wifi, description: 'Testando velocidade da conexão...' },
  { id: 'browser', label: 'Navegador', icon: Globe, description: 'Verificando compatibilidade...' },
];

const STATUS = { idle: 'idle', checking: 'checking', ok: 'ok', fail: 'fail', warn: 'warn' };

// Navegadores compatíveis com WebRTC
const isBrowserCompatible = () => {
  const ua = navigator.userAgent;
  const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isOpera = /OPR/.test(ua);
  const hasPeerConnection = typeof RTCPeerConnection !== 'undefined';
  const hasMediaDevices = typeof navigator.mediaDevices !== 'undefined';
  return {
    compatible: hasPeerConnection && hasMediaDevices,
    browser: isChrome ? 'Chrome' : isFirefox ? 'Firefox' : isSafari ? 'Safari' : isEdge ? 'Edge' : isOpera ? 'Opera' : 'Outro'
  };
};

// Medidor de volume do microfone
const AudioMeter = ({ stream }) => {
  const [volume, setVolume] = useState(0);
  const analyserRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    if (!stream) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(dataArray);
        const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
        setVolume(Math.min(100, avg * 2));
        animRef.current = requestAnimationFrame(tick);
      };
      tick();

      return () => {
        cancelAnimationFrame(animRef.current);
        audioCtx.close();
      };
    } catch (e) {
      console.warn('AudioMeter error:', e);
    }
  }, [stream]);

  const bars = 12;
  return (
    <div className="flex items-end gap-0.5 h-8">
      {Array.from({ length: bars }).map((_, i) => {
        const threshold = (i / bars) * 100;
        const active = volume > threshold;
        return (
          <div
            key={i}
            className={`w-2 rounded-sm transition-all duration-75 ${
              active
                ? volume > 80 ? 'bg-red-500' : volume > 50 ? 'bg-amber-400' : 'bg-emerald-400'
                : 'bg-slate-600'
            }`}
            style={{ height: `${20 + (i / bars) * 80}%` }}
          />
        );
      })}
    </div>
  );
};

const PreConsultaCheck = ({ open, onOpenChange, onReady, isDoctor = false }) => {
  const [checks, setChecks] = useState({
    camera: { status: STATUS.idle, message: '', hint: '' },
    microphone: { status: STATUS.idle, message: '', hint: '' },
    connection: { status: STATUS.idle, message: '', hint: '' },
    browser: { status: STATUS.idle, message: '', hint: '' },
  });
  const [currentStep, setCurrentStep] = useState(null);
  const [cameraStream, setCameraStream] = useState(null);
  const [audioStream, setAudioStream] = useState(null);
  const [isRunning, setIsRunning] = useState(false);
  const [allPassed, setAllPassed] = useState(false);
  const videoPreviewRef = useRef(null);

  const updateCheck = useCallback((id, update) => {
    setChecks(prev => ({ ...prev, [id]: { ...prev[id], ...update } }));
  }, []);

  // Cleanup streams ao fechar
  useEffect(() => {
    if (!open) {
      cameraStream?.getTracks().forEach(t => t.stop());
      audioStream?.getTracks().forEach(t => t.stop());
      setCameraStream(null);
      setAudioStream(null);
    }
  }, [open]);

  // Conectar preview de vídeo
  useEffect(() => {
    if (videoPreviewRef.current && cameraStream) {
      videoPreviewRef.current.srcObject = cameraStream;
    }
  }, [cameraStream, checks.camera.status]);

  const runChecks = useCallback(async () => {
    setIsRunning(true);
    setAllPassed(false);
    let allOk = true;

    // Reset
    setChecks({
      camera: { status: STATUS.checking, message: '', hint: '' },
      microphone: { status: STATUS.idle, message: '', hint: '' },
      connection: { status: STATUS.idle, message: '', hint: '' },
      browser: { status: STATUS.idle, message: '', hint: '' },
    });

    // ── 1. Câmera ──
    setCurrentStep('camera');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      setCameraStream(stream);
      updateCheck('camera', { status: STATUS.ok, message: 'Câmera funcionando ✓' });
    } catch (err) {
      allOk = false;
      const hint = err.name === 'NotAllowedError'
        ? 'Permissão negada. Clique no ícone de câmera na barra de endereços e permita o acesso.'
        : err.name === 'NotFoundError'
        ? 'Nenhuma câmera encontrada. Verifique se seu dispositivo possui câmera.'
        : 'Verifique se a câmera não está em uso por outro aplicativo.';
      updateCheck('camera', { status: STATUS.fail, message: err.message, hint });
    }

    await new Promise(r => setTimeout(r, 400));

    // ── 2. Microfone ──
    setCurrentStep('microphone');
    updateCheck('microphone', { status: STATUS.checking });
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setAudioStream(stream);
      updateCheck('microphone', { status: STATUS.ok, message: 'Microfone funcionando ✓' });
    } catch (err) {
      allOk = false;
      const hint = err.name === 'NotAllowedError'
        ? 'Permissão negada. Permita acesso ao microfone nas configurações do navegador.'
        : 'Verifique se o microfone está conectado e não está em uso.';
      updateCheck('microphone', { status: STATUS.fail, message: err.message, hint });
    }

    await new Promise(r => setTimeout(r, 400));

    // ── 3. Conexão ──
    setCurrentStep('connection');
    updateCheck('connection', { status: STATUS.checking });
    try {
      const start = Date.now();
      await fetch('https://www.google.com/generate_204', { cache: 'no-store', mode: 'no-cors' });
      const ping = Date.now() - start;
      if (ping < 500) {
        updateCheck('connection', { status: STATUS.ok, message: `Conexão estável (${ping}ms)` });
      } else {
        updateCheck('connection', {
          status: STATUS.warn,
          message: `Conexão lenta (${ping}ms)`,
          hint: 'Conexão pode estar lenta. Considere usar Wi-Fi ou conexão com fio para melhor qualidade.'
        });
      }
    } catch {
      // no-cors pode falhar — tentar fallback
      try {
        const start = Date.now();
        const img = new Image();
        await new Promise((res, rej) => {
          img.onload = res;
          img.onerror = res; // no-cors images may error but still show latency
          img.src = `https://www.gstatic.com/generate_204?t=${Date.now()}`;
          setTimeout(rej, 5000);
        });
        const ping = Date.now() - start;
        updateCheck('connection', { status: STATUS.ok, message: `Conexão ok (~${ping}ms)` });
      } catch {
        allOk = false;
        updateCheck('connection', {
          status: STATUS.fail,
          message: 'Sem conexão com a internet',
          hint: 'Verifique sua conexão com a internet antes de continuar.'
        });
      }
    }

    await new Promise(r => setTimeout(r, 400));

    // ── 4. Navegador ──
    setCurrentStep('browser');
    updateCheck('browser', { status: STATUS.checking });
    const { compatible, browser } = isBrowserCompatible();
    if (compatible) {
      updateCheck('browser', { status: STATUS.ok, message: `${browser} compatível ✓` });
    } else {
      allOk = false;
      updateCheck('browser', {
        status: STATUS.fail,
        message: `${browser} pode não suportar videochamadas`,
        hint: 'Use Google Chrome, Firefox ou Safari atualizado para melhor experiência.'
      });
    }

    setCurrentStep(null);
    setAllPassed(allOk);
    setIsRunning(false);
  }, [updateCheck]);

  // Iniciar verificação ao abrir
  useEffect(() => {
    if (open && !isRunning && checks.camera.status === STATUS.idle) {
      runChecks();
    }
  }, [open]);

  const getStatusIcon = (status) => {
    switch (status) {
      case STATUS.ok: return <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />;
      case STATUS.fail: return <XCircle className="w-5 h-5 text-red-400 flex-shrink-0" />;
      case STATUS.warn: return <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />;
      case STATUS.checking: return <Loader2 className="w-5 h-5 text-blue-400 animate-spin flex-shrink-0" />;
      default: return <div className="w-5 h-5 rounded-full border-2 border-slate-600 flex-shrink-0" />;
    }
  };

  const hasFailures = Object.values(checks).some(c => c.status === STATUS.fail);
  const allComplete = Object.values(checks).every(c => c.status !== STATUS.idle && c.status !== STATUS.checking);

  return (
    <Dialog open={open} onOpenChange={(val) => { if (!isRunning) onOpenChange(val); }}>
      <DialogContent
        className="sm:max-w-[560px] bg-slate-900 border-slate-700/50 text-white p-0 overflow-hidden"
        onInteractOutside={e => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-4 border-b border-slate-800">
          <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4 text-blue-400" />
            </div>
            Verificação Técnica
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Vamos garantir que tudo está funcionando antes da sua consulta.
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 space-y-4">
          {/* Preview de câmera */}
          {checks.camera.status === STATUS.ok && cameraStream && (
            <div className="relative rounded-xl overflow-hidden bg-slate-800 aspect-video border border-slate-700/50">
              <video
                ref={videoPreviewRef}
                autoPlay
                muted
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 left-2">
                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                  Câmera ao vivo
                </Badge>
              </div>
            </div>
          )}

          {/* Checks list */}
          <div className="space-y-2">
            {CHECK_STEPS.map(step => {
              const check = checks[step.id];
              const Icon = step.icon;
              return (
                <div key={step.id} className={`rounded-xl p-4 border transition-all ${
                  check.status === STATUS.ok ? 'bg-emerald-500/5 border-emerald-500/20' :
                  check.status === STATUS.fail ? 'bg-red-500/5 border-red-500/20' :
                  check.status === STATUS.warn ? 'bg-amber-500/5 border-amber-500/20' :
                  check.status === STATUS.checking ? 'bg-blue-500/5 border-blue-500/20' :
                  'bg-slate-800/50 border-slate-700/30'
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                      check.status === STATUS.ok ? 'bg-emerald-500/10' :
                      check.status === STATUS.fail ? 'bg-red-500/10' :
                      check.status === STATUS.warn ? 'bg-amber-500/10' :
                      check.status === STATUS.checking ? 'bg-blue-500/10' :
                      'bg-slate-700/50'
                    }`}>
                      <Icon className={`w-4 h-4 ${
                        check.status === STATUS.ok ? 'text-emerald-400' :
                        check.status === STATUS.fail ? 'text-red-400' :
                        check.status === STATUS.warn ? 'text-amber-400' :
                        check.status === STATUS.checking ? 'text-blue-400' :
                        'text-slate-500'
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white">{step.label}</p>
                      <p className="text-xs text-slate-400 mt-0.5 truncate">
                        {check.status === STATUS.idle ? step.description : check.message || step.description}
                      </p>
                    </div>
                    {getStatusIcon(check.status)}
                  </div>

                  {/* Medidor de volume */}
                  {step.id === 'microphone' && check.status === STATUS.ok && audioStream && (
                    <div className="mt-3 pl-12">
                      <p className="text-xs text-slate-500 mb-1">Fale algo para testar...</p>
                      <AudioMeter stream={audioStream} />
                    </div>
                  )}

                  {/* Hint de falha */}
                  {check.hint && (check.status === STATUS.fail || check.status === STATUS.warn) && (
                    <div className={`mt-3 pl-12 flex items-start gap-2 ${
                      check.status === STATUS.fail ? 'text-red-300' : 'text-amber-300'
                    }`}>
                      <Info className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      <p className="text-xs leading-relaxed">{check.hint}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Ações */}
          <div className="flex flex-col gap-2 pt-2">
            {allComplete && hasFailures && (
              <Button
                onClick={runChecks}
                variant="outline"
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-800 gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Testar novamente
              </Button>
            )}

            <Button
              onClick={() => {
                cameraStream?.getTracks().forEach(t => t.stop());
                audioStream?.getTracks().forEach(t => t.stop());
                onReady?.();
                onOpenChange(false);
              }}
              disabled={!allComplete || (hasFailures && !isDoctor)}
              className={`w-full h-11 font-semibold rounded-xl gap-2 ${
                allPassed
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30 shadow-lg'
                  : allComplete && hasFailures && isDoctor
                  ? 'bg-amber-600 hover:bg-amber-500 text-white'
                  : 'bg-slate-700 text-slate-400 cursor-not-allowed'
              }`}
            >
              {!allComplete ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Verificando...</>
              ) : allPassed ? (
                <><CheckCircle2 className="w-4 h-4" /> Estou pronto — Entrar</>
              ) : isDoctor ? (
                <><ArrowRight className="w-4 h-4" /> Entrar mesmo assim</>
              ) : (
                <><XCircle className="w-4 h-4" /> Corrija os erros acima</>
              )}
            </Button>

            {/* Skip para médico */}
            {isDoctor && !allComplete && (
              <button
                onClick={() => { onReady?.(); onOpenChange(false); }}
                className="flex items-center justify-center gap-1.5 text-slate-500 hover:text-slate-300 text-xs transition-colors mt-1"
              >
                <SkipForward className="w-3 h-3" />
                Pular verificação (médico)
              </button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreConsultaCheck;
