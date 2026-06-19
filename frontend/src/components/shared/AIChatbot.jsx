import React, { useState, useRef, useEffect } from 'react';
import { chatWithAI } from '../../api/api';
import { FiSend, FiX, FiMessageCircle, FiCpu, FiMic, FiMicOff, FiVolume2, FiVolumeX, FiImage } from 'react-icons/fi';

const QUICK_PROMPTS = [
  'I need an ambulance!',
  'Find a plumber near me',
  'How to report a crime?',
  'First aid for burns',
  'Electrician available?',
];

export default function AIChatbot() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "👋 Hello! I'm your Community Help assistant. I can help you with emergencies, utility services, and more. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [speakResponses, setSpeakResponses] = useState(true);
  const [image, setImage] = useState(null);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);
  const recognitionRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setImage(reader.result);
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.onresult = (e) => {
        const transcript = e.results[0][0].transcript;
        setInput(transcript);
        sendMessage(transcript);
      };
      recognitionRef.current.onend = () => setListening(false);
    }
  }, []);

  useEffect(() => {
    // Load voices early so they are available when needed
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => {
        window.speechSynthesis.getVoices();
      };
    }
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const speak = (text) => {
    if (!speakResponses) return;
    
    if (window.currentAudio) {
      window.currentAudio.pause();
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    const cleanText = text.replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '').trim(); // Strip emojis
    if (!cleanText) return;

    // Auto-detect language using Unicode blocks
    const detectLanguagePrefix = (str) => {
      if (/[\u0900-\u097F]/.test(str)) return 'hi'; // Devanagari (Hindi, Marathi, Konkani)
      if (/[\u0C80-\u0CFF]/.test(str)) return 'kn'; // Kannada
      if (/[\u0B80-\u0BFF]/.test(str)) return 'ta'; // Tamil
      if (/[\u0D00-\u0D7F]/.test(str)) return 'ml'; // Malayalam
      if (/[\u0C00-\u0C7F]/.test(str)) return 'te'; // Telugu
      return 'en'; // Default
    };

    const langPrefix = detectLanguagePrefix(cleanText);
    
    // Google TTS max length is 200 chars, so split by sentences
    const chunks = cleanText.match(/[^.!?\n]+[.!?\n]+/g) || [cleanText];
    let currentChunk = 0;

    const playNextChunk = () => {
      if (currentChunk >= chunks.length) return;
      
      // Crop to 200 chars to be safe for Google TTS limits
      const chunkText = chunks[currentChunk].substring(0, 200); 
      const url = `/api/ai/tts?text=${encodeURIComponent(chunkText)}&lang=${langPrefix}`;
      
      const audio = new Audio(url);
      window.currentAudio = audio;
      
      audio.onended = () => {
        currentChunk++;
        playNextChunk();
      };
      
      audio.play().catch(e => {
        console.warn("Google TTS blocked/failed, falling back to local TTS:", e);
        if (!window.speechSynthesis) return;
        const utterance = new SpeechSynthesisUtterance(chunkText);
        
        // Approximate the language code for fallback
        const fallbackLangCode = langPrefix === 'en' ? 'en-US' : `${langPrefix}-IN`;
        utterance.lang = fallbackLangCode;
        
        const voices = window.speechSynthesis.getVoices();
        const voice = voices.find(v => v.lang === fallbackLangCode) || 
                      voices.find(v => v.lang.startsWith(langPrefix));
        if (voice) utterance.voice = voice;
        
        utterance.onend = () => {
          currentChunk++;
          playNextChunk();
        };
        window.speechSynthesis.speak(utterance);
      });
    };

    playNextChunk();
  };

  const toggleListen = () => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      window.speechSynthesis.cancel();
      recognitionRef.current?.start();
      setListening(true);
    }
  };

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg && !image) return;
    setInput('');
    const currentImage = image;
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';

    const userMsg = { role: 'user', content: msg, image: currentImage };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    try {
      const context = messages.slice(-6).map(m => ({ role: m.role, content: m.content }));
      const { data } = await chatWithAI({ message: msg, context, image: currentImage });
      const finalReply = data.reply || "I couldn't process that, but I'm here to help!";
      setMessages(prev => [...prev, { role: 'assistant', content: finalReply }]);
      speak(finalReply);
    } catch (err) {
      const fallbackReply = err.response?.data?.reply || "I'm having trouble connecting. For emergencies, please use the SOS button or call 112.";
      setMessages(prev => [...prev, { role: 'assistant', content: fallbackReply }]);
      speak(fallbackReply);
    } finally { setLoading(false); }
  };

  return (
    <>
      {/* Floating Button */}
      <button onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gradient-to-br from-red-600 to-red-700 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-110 transition-all z-40 flex items-center justify-center">
        <FiMessageCircle className="w-6 h-6" />
      </button>

      {/* Chat Window */}
      {open && (
        <div className="fixed bottom-0 right-0 w-full h-[100dvh] sm:h-[500px] sm:bottom-24 sm:right-6 sm:w-96 bg-white sm:rounded-3xl shadow-2xl border border-gray-100 flex flex-col z-50 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-600 to-red-700 px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                <FiCpu className="text-white w-5 h-5" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">AI Assistant</div>
                <div className="text-red-100 text-xs flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-400 rounded-full inline-block" />Online</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => {
                if (speakResponses) {
                  if (window.currentAudio) window.currentAudio.pause();
                  if (window.speechSynthesis) window.speechSynthesis.cancel();
                }
                setSpeakResponses(!speakResponses);
              }} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition" title="Toggle Voice Output">
                {speakResponses ? <FiVolume2 className="text-white" /> : <FiVolumeX className="text-red-200" />}
              </button>
              <button onClick={() => {
                setOpen(false);
                setMessages([{ role: 'assistant', content: "👋 Hello! I'm your Community Help assistant. I can help you with emergencies, utility services, and more. How can I help you today?" }]);
                if (window.currentAudio) window.currentAudio.pause();
                if (window.speechSynthesis) window.speechSynthesis.cancel();
              }} className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition">
                <FiX className="text-white" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-line ${
                  m.role === 'user'
                    ? 'bg-red-600 text-white rounded-br-sm'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-sm'
                }`}>
                  {m.image && <img src={m.image} alt="upload" className="max-w-full h-auto rounded-lg mb-2 border border-white/20" />}
                  <div dangerouslySetInnerHTML={{ 
                    __html: m.content
                      ? m.content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                 .replace(/\*(.*?)\*/g, '<em>$1</em>')
                                 .replace(/- /g, '• ')
                      : ''
                  }} />
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => <div key={i} className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: `${i*0.15}s` }} />)}
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 bg-white border-t border-gray-50 flex gap-2 overflow-x-auto">
            {QUICK_PROMPTS.map(p => (
              <button key={p} onClick={() => sendMessage(p)}
                className="whitespace-nowrap text-xs px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-full transition text-gray-600 font-medium">
                {p}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="bg-white border-t border-gray-100">
            {image && (
              <div className="px-4 pt-3 pb-1 flex relative">
                <div className="relative">
                  <img src={image} alt="preview" className="h-16 w-16 object-cover rounded-xl border-2 border-red-100" />
                  <button onClick={() => { setImage(null); fileInputRef.current.value = ''; }} className="absolute -top-2 -right-2 bg-gray-800 text-white rounded-full p-1 shadow hover:bg-gray-900 transition">
                    <FiX className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
            <div className="px-4 py-3 flex gap-2 items-center">
              <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
              <button onClick={() => fileInputRef.current?.click()} title="Upload Image"
                className="w-10 h-10 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl flex items-center justify-center transition">
                <FiImage className="w-4 h-4" />
              </button>
              <button onClick={toggleListen} disabled={!recognitionRef.current} title="Voice Input"
                className={`w-10 h-10 rounded-xl flex items-center justify-center transition ${listening ? 'bg-red-100 text-red-600 animate-pulse' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'} disabled:opacity-40`}>
                {listening ? <FiMic className="w-4 h-4" /> : <FiMicOff className="w-4 h-4" />}
              </button>
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                placeholder={listening ? "Listening..." : "Type a message..."}
                className="flex-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 min-w-0"
              />
              <button onClick={() => sendMessage()} disabled={(!input.trim() && !image) || loading}
                className="w-10 h-10 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white rounded-xl flex items-center justify-center transition shrink-0">
                <FiSend className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
