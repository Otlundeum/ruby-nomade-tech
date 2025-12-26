
import React, { useState, useEffect, useRef } from 'react';
import { Message, AppState, Service, UserContact } from './types';
import { SERVICES, COMPANY_NAME, CONTACT_PHONE, RUBY_AVATAR } from './constants';
import { getGeminiResponse } from './geminiService';
import { saveMessageToSupabase, saveLeadToSupabase } from './supabaseClient';
import { sendEmailToAdmin } from './emailService';
import { 
  PaperAirplaneIcon, 
  ArrowPathIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  MoonIcon,
  SunIcon,
  GlobeAltIcon,
  AcademicCapIcon
} from '@heroicons/react/24/solid';

const MessageContent: React.FC<{ content: string, role: 'user' | 'assistant', isDarkMode: boolean }> = ({ content, role, isDarkMode }) => {
  const cleanContent = content.replace(/[*_]/g, '');
  const parts = cleanContent.split(/(www\.nomadetech\.digital|\+221777867118)/g);
  
  return (
    <div className="text-[15.5px] leading-[1.5] tracking-tight whitespace-pre-line font-[450]">
      {parts.map((part, i) => {
        if (part === 'www.nomadetech.digital') {
          return (
            <a 
              key={i} 
              href="https://www.nomadetech.digital" 
              target="_blank" 
              rel="noopener noreferrer" 
              className={`font-bold underline decoration-2 underline-offset-2 ${role === 'user' ? 'text-white' : 'text-emerald-500'}`}
            >
              {part}
            </a>
          );
        }
        if (part === CONTACT_PHONE) {
          return (
            <a 
              key={i} 
              href={`tel:${CONTACT_PHONE}`} 
              className={`font-bold underline decoration-2 underline-offset-2 ${role === 'user' ? 'text-white' : 'text-emerald-500'}`}
            >
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
};

const App: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [appState, setAppState] = useState<AppState>(AppState.INITIAL);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const [contactInfo, setContactInfo] = useState<UserContact>({ fullName: '', phone: '', email: '' });
  const [userDescription, setUserDescription] = useState('');
  const [isEmailSending, setIsEmailSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const startChat = async () => {
      setIsLoading(true);
      const now = new Date();
      const timeStr = now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const response = await getGeminiResponse([], timeStr);
      
      const initialMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: response.replace(/[*_]/g, '') || "Bonjour ! Je suis Ruby, votre assistant IA.\n\nComment puis-je vous aider ?",
        timestamp: timeStr
      };
      
      // Délai de 4 secondes pour le premier message
      setTimeout(() => {
        setMessages([initialMessage]);
        setAppState(AppState.SERVICE_SELECTION);
        setIsLoading(false);
        saveMessageToSupabase(sessionId, initialMessage.role, initialMessage.content);
      }, 4000);
    };
    startChat();
  }, [sessionId]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: currentInput, timestamp: timeStr };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    saveMessageToSupabase(sessionId, userMsg.role, userMsg.content);

    if (appState === AppState.DESCRIPTION) {
      if (currentInput.length < 50) {
        setIsLoading(true);
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Votre description est un peu courte (minimum 50 caractères). Pourriez-vous me donner plus de détails sur vos attentes ?",
            timestamp: timeStr
          }]);
          setIsLoading(false);
        }, 4000);
        return;
      }
      setUserDescription(currentInput);
      setIsLoading(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "C'est noté. Pour finaliser votre demande d'accompagnement, j'ai besoin de vos coordonnées.",
          timestamp: timeStr
        }]);
        setAppState(AppState.CONTACT_COLLECTION);
        setIsLoading(false);
      }, 4000);
      return;
    }

    setIsLoading(true);
    const responseText = await getGeminiResponse([...messages, userMsg], timeStr, selectedService?.name);
    
    // Délai de 4 secondes avant d'afficher la réponse de l'IA
    setTimeout(() => {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: responseText || "Je suis là pour vous.", timestamp: timeStr }]);
      setIsLoading(false);
    }, 4000);
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: service.name, timestamp: timeStr }]);
    
    setIsLoading(true);
    // Délai de 4 secondes avant de demander la validation
    setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `Vous avez sélectionné : ${service.name}.\n\nValidez-vous votre choix ?`,
          timestamp: timeStr
        }]);
        setAppState(AppState.VALIDATION);
        setIsLoading(false);
    }, 4000);
  };

  const handleValidation = (valid: boolean) => {
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: valid ? "Oui, je valide" : "Non, je souhaite changer", timestamp: timeStr }]);
    
    setIsLoading(true);
    setTimeout(() => {
      if (valid && selectedService) {
        if (selectedService.id === 'formation') {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Souhaitez-vous consulter nos formations prêtes à l'achat sur www.nomadetech.digital ou préférez-vous un accompagnement personnalisé ?`,
            timestamp: timeStr
          }]);
          setAppState(AppState.FORMATION_CHOICE);
        } else if (selectedService.id === 'support') {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `${selectedService.description}\n\nPuis-je vous renseigner sur un autre service ?`,
            timestamp: timeStr
          }]);
          setAppState(AppState.ASK_ANYTHING_ELSE);
        } else {
          const promptText = selectedService.id === 'chatbot' 
            ? "Excellent ! Pourriez-vous me décrire quel genre de chatbot vous imaginez pour votre entreprise ? (minimum 50 caractères)"
            : "Parfait ! Dites-m'en un peu plus sur votre besoin ou votre projet (50 caractères minimum) :";
            
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: promptText, timestamp: timeStr }]);
          setAppState(AppState.DESCRIPTION);
        }
      } else {
        setAppState(AppState.SERVICE_SELECTION);
      }
      setIsLoading(false);
    }, 4000);
  };

  const handleFormationOption = (isPersonalized: boolean) => {
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { 
      id: Date.now().toString(), 
      role: 'user', 
      content: isPersonalized ? "Je veux une formation personnalisée" : "Je vais voir sur le site", 
      timestamp: timeStr 
    }]);

    setIsLoading(true);
    setTimeout(() => {
      if (isPersonalized) {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Parfait ! Quel type de formation recherchez-vous ? (Marketing, E-commerce, IA, etc.)\n\nMerci de rédiger une description exacte de vos attentes (50 caractères minimum).",
          timestamp: timeStr
        }]);
        setAppState(AppState.DESCRIPTION);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "C'est entendu. Vous trouverez tout notre catalogue ici : www.nomadetech.digital\n\nAvez-vous besoin d'autre chose ?",
          timestamp: timeStr
        }]);
        setAppState(AppState.ASK_ANYTHING_ELSE);
      }
      setIsLoading(false);
    }, 4000);
  };

  const handleAnythingElse = (more: boolean) => {
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: more ? "Oui, j'ai une autre demande" : "Non, merci Ruby", timestamp: timeStr }]);
    
    setIsLoading(true);
    setTimeout(() => {
      if (more) {
        setAppState(AppState.SERVICE_SELECTION);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Merci pour votre confiance. L'équipe de Nomade Technology vous souhaite une excellente journée !", timestamp: timeStr }]);
        setAppState(AppState.COMPLETED);
      }
      setIsLoading(false);
    }, 4000);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailSending(true);
    setIsLoading(true);
    
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    saveLeadToSupabase(sessionId, contactInfo, selectedService?.name || 'Inconnu', userDescription);
    await sendEmailToAdmin({
      subject: `NOUVEAU LEAD : ${contactInfo.fullName}`,
      message: `Contact: ${contactInfo.fullName}\nTel: ${contactInfo.phone}\nEmail: ${contactInfo.email}\nService: ${selectedService?.name}\nDescription: ${userDescription}`,
      type: 'lead',
      details: contactInfo
    });

    setTimeout(() => {
      const thanks: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Merci ${contactInfo.fullName} ! Votre demande est bien enregistrée. Nous allons l'analyser et revenir vers vous très rapidement.`,
        timestamp: timeStr
      };
      setMessages(prev => [...prev, thanks]);
      setAppState(AppState.COMPLETED);
      setIsEmailSending(false);
      setIsLoading(false);
    }, 4000);
  };

  return (
    <div className={`flex flex-col h-[100dvh] transition-all duration-500 overflow-hidden ${isDarkMode ? 'bg-black text-white' : 'bg-[#F2F2F7] text-slate-900'}`}>
      
      {/* HEADER iOS GLASS */}
      <header className={`ios-blur border-b p-4 flex items-center justify-between sticky top-0 z-50 transition-colors ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-white/70 border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <div className="relative online-pulse">
            <div className={`w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg transition-all duration-500 hover:scale-105 ${
              isDarkMode ? 'border-white/20' : 'border-white'
            }`}>
              <img 
                src={RUBY_AVATAR} 
                alt="Ruby Profile" 
                className="w-full h-full object-cover object-center"
              />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-[16px] tracking-tight leading-tight">Ruby</h1>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 bg-emerald-500 rounded-full ${isLoading ? 'animate-bounce' : 'animate-pulse'}`}></span>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest min-w-[60px]">
                {isLoading ? 'écrit...' : 'En ligne'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleDarkMode} className={`p-2.5 rounded-full transition-all active:scale-90 ${isDarkMode ? 'bg-white/10 text-yellow-400 hover:bg-white/20' : 'bg-slate-200/50 text-slate-600 hover:bg-slate-200'}`}>
            {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
          <button onClick={() => window.location.reload()} className={`p-2.5 rounded-full transition-all active:scale-90 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* CHAT AREA */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 hide-scrollbar pb-10">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} fade-in-up`}>
              <div className={`max-w-[85%] px-4 py-3 shadow-sm ${
                isUser 
                  ? 'bg-emerald-600 text-white rounded-[22px] rounded-br-sm font-medium' 
                  : (isDarkMode ? 'bg-[#1C1C1E] text-white rounded-[22px] rounded-bl-sm border border-white/5' : 'bg-white text-slate-800 rounded-[22px] rounded-bl-sm border border-slate-100')
              }`}>
                <MessageContent content={msg.content} role={msg.role} isDarkMode={isDarkMode} />
                <p className={`text-[9px] mt-1.5 opacity-40 font-bold uppercase tracking-tighter ${isUser ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp}
                </p>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start fade-in-up">
             <div className={`px-5 py-4 rounded-[22px] rounded-bl-sm border ${isDarkMode ? 'bg-[#1C1C1E] border-white/5' : 'bg-white border-slate-100'}`}>
                <div className={`typing-wave ${isDarkMode ? 'text-emerald-500' : 'text-emerald-600'}`}>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                    <div className="typing-dot"></div>
                </div>
             </div>
          </div>
        )}

        {appState === AppState.SERVICE_SELECTION && !isLoading && (
          <div className="grid gap-2.5 pt-4 animate-in slide-in-from-bottom-6 duration-700">
            <p className="text-[11px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] px-2 mb-1">Nos Expertises</p>
            {SERVICES.map(s => (
              <button 
                key={s.id} 
                onClick={() => handleServiceSelect(s)} 
                className={`service-button p-4 rounded-[20px] text-left border shadow-sm flex items-center justify-between group ${
                  isDarkMode ? 'bg-[#1C1C1E] border-white/10 hover:border-emerald-500/50' : 'bg-white border-slate-100 hover:border-emerald-500/50'
                }`}
              >
                <span className={`font-bold text-[15px] ${isDarkMode ? 'text-white group-hover:text-emerald-400' : 'text-slate-800 group-hover:text-emerald-600'}`}>
                  {s.name}
                </span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500">→</span>
              </button>
            ))}
          </div>
        )}

        {appState === AppState.FORMATION_CHOICE && !isLoading && (
          <div className="grid gap-3 pt-6 fade-in-up max-w-[340px] mx-auto">
            <button 
              onClick={() => handleFormationOption(false)} 
              className={`flex items-center gap-3 p-4 rounded-[22px] border transition-all active:scale-95 shadow-sm ${isDarkMode ? 'bg-[#1C1C1E] border-white/10 text-white hover:border-emerald-500' : 'bg-white border-slate-200 text-slate-800 hover:border-emerald-500'}`}
            >
              <GlobeAltIcon className="w-6 h-6 text-emerald-500" />
              <div className="text-left">
                <p className="font-black text-xs uppercase tracking-widest">Voir le site</p>
                <p className="text-[10px] opacity-50">Catalogue en ligne</p>
              </div>
            </button>
            <button 
              onClick={() => handleFormationOption(true)} 
              className="flex items-center gap-3 p-4 bg-emerald-600 text-white rounded-[22px] transition-all active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              <AcademicCapIcon className="w-6 h-6" />
              <div className="text-left">
                <p className="font-black text-xs uppercase tracking-widest">Formation Perso</p>
                <p className="text-[10px] opacity-80">Accompagnement sur mesure</p>
              </div>
            </button>
          </div>
        )}

        {(appState === AppState.VALIDATION || appState === AppState.ASK_ANYTHING_ELSE) && !isLoading && (
          <div className="flex gap-3 max-w-[320px] mx-auto pt-6 fade-in-up">
            <button 
              onClick={() => appState === AppState.VALIDATION ? handleValidation(true) : handleAnythingElse(true)} 
              className="flex-1 py-4 bg-emerald-600 text-white rounded-[22px] font-black text-xs uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              OUI
            </button>
            <button 
              onClick={() => appState === AppState.VALIDATION ? handleValidation(false) : handleAnythingElse(false)} 
              className={`flex-1 py-4 rounded-[22px] font-black text-xs uppercase tracking-widest border active:scale-95 transition-all ${isDarkMode ? 'bg-[#1C1C1E] border-white/10 text-white/50' : 'bg-white border-slate-200 text-slate-400'}`}
            >
              NON
            </button>
          </div>
        )}

        {appState === AppState.CONTACT_COLLECTION && (
          <form onSubmit={handleContactSubmit} className={`p-6 rounded-[32px] shadow-2xl space-y-4 animate-in zoom-in-95 border ${isDarkMode ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-50'}`}>
            <h3 className="font-black text-center text-[10px] uppercase tracking-[0.3em] mb-4 opacity-40">Vos Coordonnées</h3>
            <div className="space-y-3">
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input required type="text" placeholder="Nom complet" value={contactInfo.fullName} onChange={e => setContactInfo({...contactInfo, fullName: e.target.value})} className={`w-full p-4 pl-12 rounded-[18px] text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 ${isDarkMode ? 'bg-white/5 text-white border border-white/5' : 'bg-slate-100 border-transparent'}`} />
              </div>
              <div className="relative group">
                <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input required type="tel" placeholder="Téléphone" value={contactInfo.phone} onChange={e => setContactInfo({...contactInfo, phone: e.target.value})} className={`w-full p-4 pl-12 rounded-[18px] text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 ${isDarkMode ? 'bg-white/5 text-white border border-white/5' : 'bg-slate-100 border-transparent'}`} />
              </div>
              <div className="relative group">
                <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
                <input required type="email" placeholder="Email" value={contactInfo.email} onChange={e => setContactInfo({...contactInfo, email: e.target.value})} className={`w-full p-4 pl-12 rounded-[18px] text-sm font-medium outline-none transition-all focus:ring-2 focus:ring-emerald-500/20 ${isDarkMode ? 'bg-white/5 text-white border border-white/5' : 'bg-slate-100 border-transparent'}`} />
              </div>
            </div>
            <button type="submit" disabled={isEmailSending || isLoading} className="w-full py-4 bg-emerald-600 text-white rounded-[18px] font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/30 active:scale-95 transition-all disabled:opacity-50 mt-4">
              {isEmailSending ? "Envoi en cours..." : "Valider ma demande"}
            </button>
          </form>
        )}
        <div ref={messagesEndRef} className="h-6" />
      </main>

      {/* INPUT iOS STYLE */}
      <footer className={`p-4 pb-8 ios-blur border-t transition-colors ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-white/70 border-slate-200'}`}>
        <div className="max-w-3xl mx-auto relative">
          <textarea 
            disabled={isLoading || appState === AppState.CONTACT_COLLECTION || appState === AppState.VALIDATION || appState === AppState.FORMATION_CHOICE || appState === AppState.ASK_ANYTHING_ELSE || appState === AppState.COMPLETED} 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} 
            placeholder={appState === AppState.DESCRIPTION ? "Décrivez votre besoin ici..." : "Un message pour Ruby ?"} 
            className={`w-full p-4 pr-14 rounded-[28px] text-[15px] font-medium outline-none transition-all resize-none max-h-32 border focus:ring-2 focus:ring-emerald-500/20 ${
              isDarkMode ? 'bg-[#1C1C1E] border-white/10 text-white placeholder:text-white/20' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'
            }`} 
            rows={1} 
          />
          <button 
            onClick={() => handleSendMessage()} 
            disabled={!input.trim() || isLoading} 
            className={`absolute right-1.5 bottom-1.5 p-3 rounded-full shadow-lg transition-all active:scale-90 ${
              !input.trim() ? 'bg-slate-200 text-slate-400 dark:bg-white/5 opacity-0' : 'bg-emerald-600 text-white'
            }`}
          >
            <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
