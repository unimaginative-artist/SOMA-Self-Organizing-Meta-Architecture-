import { useState, useRef, useEffect, useCallback } from 'react';
import { initElevenLabs, textToSpeech, isElevenLabsEnabled } from '../utils/elevenLabsTTS';
import { reasonWithSoma, checkSomaHealth, formatResponseForSpeech, SomaCognitiveStream } from '../utils/somaClient';

// Audio configuration constants
const OUTPUT_SAMPLE_RATE = 24000;

// Helper for smooth value transitions
const lerp = (start, end, factor) => {
  return start + (end - start) * factor;
};

// Helper to calculate volume from an analyser node
const calculateVolume = (analyser, frequencyData) => {
  analyser.getByteFrequencyData(frequencyData);

  const voiceBins = frequencyData.slice(1, 32);
  let max = 0;
  for (let i = 0; i < voiceBins.length; i++) {
    if (voiceBins[i] > max) {
      max = voiceBins[i];
    }
  }

  const normalized = Math.min(1, max / 200);
  return normalized;
};

export function useSomaAudio() {
  const [isConnected, setIsConnected] = useState(false);
  const [volume, setVolume] = useState(0); // AI Volume (Output)
  const [inputVolume, setInputVolume] = useState(0); // User Volume (Input)
  const [isTalking, setIsTalking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [somaHealthy, setSomaHealthy] = useState(false);
  const [systemStatus, setSystemStatus] = useState({
    somaBackend: 'disconnected',
    whisperServer: 'native', // Using Native Browser API
    elevenLabs: 'disabled',
  });

  // Refs for audio context and processing
  const audioContextRef = useRef(null);
  const inputContextRef = useRef(null);
  const analyserRef = useRef(null);
  const inputAnalyserRef = useRef(null);
  const streamRef = useRef(null);
  const animationFrameRef = useRef(null);
  const currentVolumeRef = useRef(0);
  const currentInputVolumeRef = useRef(0);
  const conversationIdRef = useRef(`conv_${Date.now()}`);
  const cognitiveStreamRef = useRef(null);
  const elevenLabsVoiceIdRef = useRef(null);
  const recognitionRef = useRef(null); // Web Speech API ref

  const isUserInterrupting = useRef(false);
  const isSpeaking = useRef(false);

  // Pre-cached acknowledgment audio buffers for instant playback
  const acknowledgmentCacheRef = useRef(new Map());

  // Poll SOMA backend until ready (handles 3-min initialization)
  const waitForSomaBackend = async () => {
    const maxAttempts = 40; // 40 attempts * 5 seconds = 3.3 minutes
    const delayMs = 5000; // Check every 5 seconds

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      console.log(`[${attempt}/${maxAttempts}] Checking SOMA backend...`);

      setSystemStatus(prev => ({
        ...prev,
        somaBackend: 'initializing',
      }));

      const healthy = await checkSomaHealth();

      if (healthy) {
        console.log('✅ SOMA backend is ready!');
        setSystemStatus(prev => ({
          ...prev,
          somaBackend: 'connected',
        }));
        setSomaHealthy(true);
        return true;
      }

      if (attempt < maxAttempts) {
        console.log(`⏳ SOMA backend not ready. Retrying in ${delayMs / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    console.error('❌ SOMA backend failed to start after 3+ minutes');
    setSystemStatus(prev => ({
      ...prev,
      somaBackend: 'error',
    }));
    return false;
  };

  // Initialize and connect
  const connect = useCallback(async () => {
    try {
      console.log('🔌 Connecting to SOMA...');

      // Check SOMA health with polling
      const backendReady = await waitForSomaBackend();

      if (!backendReady) {
        throw new Error('SOMA backend failed to initialize.');
      }

      // Initialize ElevenLabs
      let elevenLabsKey = null;
      let elevenLabsVoiceId = null;

      if (window.electronAPI) {
        elevenLabsKey = await window.electronAPI.getElevenLabsApiKey();
        elevenLabsVoiceId = await window.electronAPI.getElevenLabsVoiceId();
      } else {
        elevenLabsKey = import.meta.env.VITE_ELEVENLABS_API_KEY;
        elevenLabsVoiceId = import.meta.env.VITE_ELEVENLABS_VOICE_ID;
      }

      const elevenLabsInitialized = initElevenLabs(elevenLabsKey);
      elevenLabsVoiceIdRef.current = elevenLabsVoiceId;

      if (!elevenLabsInitialized) {
        console.warn('⚠️ ElevenLabs not available - will use browser speech synthesis');
        setSystemStatus(prev => ({ ...prev, elevenLabs: 'fallback' }));
      } else {
        setSystemStatus(prev => ({ ...prev, elevenLabs: 'enabled' }));

        // Pre-cache common acknowledgments
        (async () => {
          const commonAcks = ['Mm-hmm.', 'Yeah?', 'Okay.', 'Right.', 'Got it.'];
          for (const ack of commonAcks) {
            try {
              const result = await textToSpeech(ack, audioContextRef.current, elevenLabsVoiceId || undefined, { energy: 0.5, stability: 0.6 });
              if (result.success && result.audioBuffer) {
                acknowledgmentCacheRef.current.set(ack, result.audioBuffer);
              }
            } catch (e) {
              // Ignore cache errors
            }
          }
        })();
      }

      // Setup Audio Contexts
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: OUTPUT_SAMPLE_RATE,
      });

      inputContextRef.current = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000,
      });

      // Setup Output Analyser (for Orb visualization)
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.1;
      analyserRef.current = analyser;
      analyser.connect(audioContextRef.current.destination);

      // Get Microphone Access for Visualization
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        streamRef.current = stream;

        // Setup Input Analyser (for User Volume visualization)
        if (inputContextRef.current) {
          const inputAnalyser = inputContextRef.current.createAnalyser();
          inputAnalyser.fftSize = 256;
          inputAnalyser.smoothingTimeConstant = 0.1;
          inputAnalyserRef.current = inputAnalyser;

          const source = inputContextRef.current.createMediaStreamSource(stream);
          source.connect(inputAnalyser);
        }
      } catch (err) {
        console.warn('Microphone access for visualization failed:', err);
      }

      // Initialize Web Speech API
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false; // We restart manually to handle state better
        recognition.interimResults = false;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
          console.log('🎤 Voice recognition active');
          setIsListening(true);
        };

        recognition.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          if (transcript.trim()) {
            console.log('🗣️ Heard:', transcript);
            processWithSoma(transcript);
          }
        };

        recognition.onend = () => {
          // Auto-restart if we are supposed to be listening and not talking/thinking
          setIsListening(false);
        };

        recognition.onerror = (event) => {
          console.warn('Voice recognition error:', event.error);
          setIsListening(false);
        };

        recognitionRef.current = recognition;
        setSystemStatus(prev => ({ ...prev, whisperServer: 'native' }));
      } else {
        console.error('❌ Web Speech API not supported in this browser');
        setSystemStatus(prev => ({ ...prev, whisperServer: 'error' }));
      }

      // Connect to SOMA cognitive stream
      try {
        const cogStream = new SomaCognitiveStream();
        await cogStream.connect();
        cognitiveStreamRef.current = cogStream;
      } catch (error) {
        console.warn('Could not connect to cognitive stream:', error);
      }

      setIsConnected(true);
      console.log('✅ Connected to SOMA');

      // Start Visualizer Loop
      const updateVolume = () => {
        if (analyserRef.current) {
          const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
          const rawVol = calculateVolume(analyserRef.current, dataArray);
          currentVolumeRef.current = lerp(currentVolumeRef.current, rawVol, 0.5);
          setVolume(currentVolumeRef.current);
        }

        if (inputAnalyserRef.current) {
          const dataArray = new Uint8Array(inputAnalyserRef.current.frequencyBinCount);
          const rawInputVol = calculateVolume(inputAnalyserRef.current, dataArray);

          currentInputVolumeRef.current = lerp(currentInputVolumeRef.current, rawInputVol, 0.2);
          setInputVolume(currentInputVolumeRef.current);

          // Interrupt logic
          if (isTalking && rawInputVol > 0.3) {
            console.log('🚫 User interruption detected');
            isUserInterrupting.current = true;
            stopSpeaking();
          }
        }

        animationFrameRef.current = requestAnimationFrame(updateVolume);
      };
      updateVolume();

    } catch (error) {
      console.error('Connection failed:', error);
      setIsConnected(false);
    }
  }, []);

  // Manage Listen State
  useEffect(() => {
    // If connected and not talking/thinking, we should be listening
    const shouldListen = isConnected && !isTalking && !isThinking;

    if (shouldListen) {
      // Debounce start to avoid rapid restarts
      const timer = setTimeout(() => {
        try {
          // Only start if not already started
          if (recognitionRef.current) {
            recognitionRef.current.start();
          }
        } catch (e) {
          // Ignore "already started" errors
        }
      }, 100);
      return () => clearTimeout(timer);
    } else {
      // Stop listening
      try {
        if (recognitionRef.current) {
          recognitionRef.current.stop();
        }
      } catch (e) {
        // Ignore
      }
    }
  }, [isConnected, isTalking, isThinking]);

  // Play audio buffer
  const playAudio = async (audioBuffer) => {
    if (!audioContextRef.current) return;

    // Resume context if suspended
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }

    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(analyserRef.current);
    source.connect(audioContextRef.current.destination);

    return new Promise((resolve) => {
      source.onended = resolve;
      source.start(0);
    });
  };

  // Stop speaking immediately
  const stopSpeaking = () => {
    if (audioContextRef.current) {
      // Disconnect/cancel logic if easy
    }
    window.speechSynthesis.cancel();
    isSpeaking.current = false;
    setIsTalking(false);
  };

  // Speak text
  const speakText = async (text) => {
    if (!text) return;
    setIsTalking(true);

    // Check cache for short common phrases (latency booster)
    if (acknowledgmentCacheRef.current.has(text) && isElevenLabsEnabled()) {
      try {
        await playAudio(acknowledgmentCacheRef.current.get(text));
        setIsTalking(false);
        return;
      } catch (e) {
        console.warn('Cache play failed, falling back');
      }
    }

    // Try ElevenLabs
    if (isElevenLabsEnabled()) {
      try {
        const result = await textToSpeech(text, audioContextRef.current, elevenLabsVoiceIdRef.current);
        if (result.success && result.audioBuffer) {
          await playAudio(result.audioBuffer);
          setIsTalking(false);
          return;
        }
      } catch (e) {
        console.warn('ElevenLabs failed:', e);
      }
    }

    // Fallback to Browser TTS
    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onend = () => {
        setIsTalking(false);
        resolve();
      };
      utterance.onerror = () => {
        setIsTalking(false);
        resolve();
      };
      window.speechSynthesis.speak(utterance);
    });
  };

  // Generate natural acknowledgment
  const generateAcknowledgment = (query) => {
    const lowerQuery = query.toLowerCase();

    if (lowerQuery.includes('?') || lowerQuery.startsWith('can you') || lowerQuery.startsWith('could you')) {
      return ['Good question.', 'Let me see.', 'Hmm.', 'One moment.'][Math.floor(Math.random() * 4)];
    }

    return ['Sure.', 'Okay.', 'Right.', 'Got it.'][Math.floor(Math.random() * 4)];
  };

  // Process query
  const processWithSoma = async (query) => {
    try {
      // 1. Acknowledge
      const acknowledgment = generateAcknowledgment(query);

      // Don't await acknowledgment fully to start fetching in parallel, 
      // but visualization needs state updates.
      speakText(acknowledgment);

      // 2. Think & Fetch
      setIsThinking(true);

      // Stop listening while thinking
      if (recognitionRef.current) recognitionRef.current.stop();

      const result = await reasonWithSoma(query, conversationIdRef.current);
      setIsThinking(false);

      if (!result.success || !result.response) {
        await speakText('Sorry, I checked out for a second. Can you say that again?');
        return;
      }

      // 3. Speak Response
      const textToSpeak = formatResponseForSpeech(result.response);
      await speakText(textToSpeak);

    } catch (error) {
      console.error('Error processing:', error);
      setIsThinking(false);
      await speakText('Something went wrong.');
    }
  };

  // External API to send text query (e.g. from chatbox)
  const sendTextQuery = useCallback((text) => {
    processWithSoma(text);
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
    }
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    window.speechSynthesis.cancel();
  }, []);

  return {
    isConnected,
    connect,
    disconnect,
    volume,
    isTalking,
    isListening,
    isThinking,
    systemStatus,
    sendTextQuery,
    somaHealthy,
    inputVolume
  };
}