// Singleton do AudioContext para reutilizar
let audioContext: AudioContext | null = null;

export const initAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
};

export const playNotificationSound = () => {
  try {
    const ctx = initAudioContext();
    
    // Verificar se AudioContext está suspenso (precisa de interação do usuário)
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    // Nota A5 (800Hz) para som de notificação
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    // Envelope de volume para som suave
    const now = ctx.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);

    // Vibrar dispositivo se suportado
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
    
    console.log("✅ Som de notificação tocado com sucesso");
    return true;
  } catch (error) {
    console.error("❌ Erro ao tocar som de notificação:", error);
    return false;
  }
};
