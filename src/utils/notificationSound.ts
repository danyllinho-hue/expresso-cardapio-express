export const playNotificationSound = () => {
  try {
    const audioContext = new AudioContext();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Nota A5 (800Hz) para som de notificação
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';

    // Envelope de volume para som suave
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);

    // Vibrar dispositivo se suportado
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200]);
    }
  } catch (error) {
    console.error("Erro ao tocar som de notificação:", error);
  }
};
