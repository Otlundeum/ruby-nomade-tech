
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
  const text = content || "";
  const cleanContent = text.replace(/[*_]/g, '');
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
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      
      const welcome = `Bonjour ! Je suis Ruby, l'IA de ${COMPANY_NAME}. Je suis ravie de vous accueillir.\n\nQuelle solution recherchez-vous aujourd'hui ?`;
      
      const initialMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: welcome,
        timestamp: timeStr
      };
      
      setMessages([initialMsg]);
      setAppState(AppState.SERVICE_SELECTION);
      setIsLoading(false);
      saveMessageToSupabase(sessionId, initialMsg.role, initialMsg.content);
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
      if (currentInput.length < 15) {
        setIsLoading(true);
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: "Pourriez-vous être un peu plus précis sur votre besoin ? Cela m'aidera à mieux vous conseiller.",
            timestamp: timeStr
          }]);
          setIsLoading(false);
        }, 600);
        return;
      }
      setUserDescription(currentInput);
      setIsLoading(true);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: "Très bien, c'est noté. Pour finaliser, laissez-moi vos coordonnées pour que l'administrateur puisse traiter votre demande.",
          timestamp: timeStr
        }]);
        setAppState(AppState.CONTACT_COLLECTION);
        setIsLoading(false);
      }, 600);
      return;
    }

    setIsLoading(true);
    try {
      const responseText = await getGeminiResponse([...messages, userMsg], timeStr, selectedService?.name);
      
      setMessages(prev => [...prev, { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: responseText, 
        timestamp: timeStr 
      }]);

      const lowerRes = responseText.toLowerCase();
      if (lowerRes.includes("coordonnées") || lowerRes.includes("recontacter")) {
        setTimeout(() => setAppState(AppState.CONTACT_COLLECTION), 1200);
      }

    } catch (err) {
      console.error("Chat Error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceSelect = (service: Service) => {
    setSelectedService(service);
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: service.name, timestamp: timeStr }]);
    
    setIsLoading(true);
    setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          role: 'assistant',
          content: `${service.description}\n\nEst-ce que cela correspond à votre recherche ?`,
          timestamp: timeStr
        }]);
        setAppState(AppState.VALIDATION);
        setIsLoading(false);
    }, 800);
  };

  const handleValidation = (valid: boolean) => {
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: valid ? "Oui, tout à fait" : "Non, je veux voir autre chose", timestamp: timeStr }]);
    
    setIsLoading(true);
    setTimeout(() => {
      if (valid && selectedService) {
        if (selectedService.id === 'formation') {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `Souhaitez-vous voir notre catalogue sur www.nomadetech.digital ou préférez-vous une formation sur-mesure ?`,
            timestamp: timeStr
          }]);
          setAppState(AppState.FORMATION_CHOICE);
        } else if (selectedService.id === 'support') {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'assistant',
            content: `${selectedService.description}\n\nAvez-vous besoin d'une autre information ?`,
            timestamp: timeStr
          }]);
          setAppState(AppState.ASK_ANYTHING_ELSE);
        } else {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Parfait. Dites-moi en quelques mots ce que vous souhaitez réaliser :", timestamp: timeStr }]);
          setAppState(AppState.DESCRIPTION);
        }
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Pas de souci. Voici la liste de nos expertises :", timestamp: timeStr }]);
        setAppState(AppState.SERVICE_SELECTION);
      }
      setIsLoading(false);
    }, 600);
  };

  const handleAnythingElse = (more: boolean) => {
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: more ? "Oui, j'ai une autre question" : "Non merci, c'est tout", timestamp: timeStr }]);
    
    setIsLoading(true);
    setTimeout(() => {
      if (more) {
        setAppState(AppState.SERVICE_SELECTION);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `Merci pour votre passage chez ${COMPANY_NAME}. Au plaisir de vous accompagner dans votre succès digital !`, timestamp: timeStr }]);
        setAppState(AppState.COMPLETED);
      }
      setIsLoading(false);
    }, 600);
  };

  const handleFormationOption = (isPersonalized: boolean) => {
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: isPersonalized ? "Sur-mesure" : "Consulter le site", timestamp: timeStr }]);
    setIsLoading(true);
    setTimeout(() => {
      if (isPersonalized) {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Quelle compétence souhaitez-vous acquérir ? (Décrivez en quelques mots)", timestamp: timeStr }]);
        setAppState(AppState.DESCRIPTION);
      } else {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "C'est noté. Voici le lien direct vers nos formations : www.nomadetech.digital\n\nBesoin d'autre chose ?", timestamp: timeStr }]);
        setAppState(AppState.ASK_ANYTHING_ELSE);
      }
      setIsLoading(false);
    }, 600);
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailSending(true);
    setIsLoading(true);
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    try {
      await saveLeadToSupabase(sessionId, contactInfo, selectedService?.name || 'Contact Direct', userDescription || 'Demande via Ruby');
      await sendEmailToAdmin({
        subject: `NOUVEAU LEAD : ${contactInfo.fullName}`,
        message: `👤 Nom: ${contactInfo.fullName}\n📞 Tel: ${contactInfo.phone}\n📧 Email: ${contactInfo.email}\n🛠 Service: ${selectedService?.name || 'Inconnu'}\n📝 Note: ${userDescription || 'Pas de note'}`,
        type: 'lead',
        details: contactInfo
      });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Merci ${contactInfo.fullName} ! Vos informations ont été transmises avec succès. L'administrateur vous recontactera très vite.`,
        timestamp: timeStr
      }]);
      setAppState(AppState.COMPLETED);
    } catch (err) {
      console.error("Submit Error:", err);
    } finally {
      setIsEmailSending(false);
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-[100dvh] transition-all duration-500 overflow-hidden ${isDarkMode ? 'bg-black text-white' : 'bg-[#F2F2F7] text-slate-900'}`}>
      <header className={`ios-blur border-b p-4 flex items-center justify-between sticky top-0 z-50 transition-colors ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-white/70 border-slate-200 shadow-sm'}`}>
        <div className="flex items-center gap-3">
          <div className="relative online-pulse">
            <div className={`w-12 h-12 rounded-full overflow-hidden border-2 shadow-lg transition-all duration-500 hover:scale-105 ${isDarkMode ? 'border-white/20' : 'border-white'}`}>
              <img src={RUBY_AVATAR} alt="Ruby" className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-[16px]">Ruby</h1>
            <div className="flex items-center gap-1.5">
              <span className={`w-1.5 h-1.5 bg-emerald-500 rounded-full ${isLoading ? 'animate-bounce' : 'animate-pulse'}`}></span>
              <p className="text-[10px] text-emerald-500 font-black uppercase tracking-widest">
                {isLoading ? 'TRAITEMENT...' : 'EN LIGNE'}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={toggleDarkMode} className={`p-2.5 rounded-full transition-all active:scale-90 ${isDarkMode ? 'bg-white/10 text-yellow-400' : 'bg-slate-200/50 text-slate-600'}`}>
            {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
          </button>
          <button onClick={() => window.location.reload()} className={`p-2.5 rounded-full transition-all active:scale-90 ${isDarkMode ? 'text-white/40' : 'text-slate-400'}`}>
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 space-y-5 hide-scrollbar pb-10">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in-up`}>
            <div className={`max-w-[85%] px-4 py-3 shadow-sm ${msg.role === 'user' ? 'bg-emerald-600 text-white rounded-[22px] rounded-br-sm' : (isDarkMode ? 'bg-[#1C1C1E] text-white rounded-[22px] rounded-bl-sm border border-white/5' : 'bg-white text-slate-800 rounded-[22px] rounded-bl-sm border border-slate-100')}`}>
              <MessageContent content={msg.content} role={msg.role} isDarkMode={isDarkMode} />
              <p className={`text-[9px] mt-1.5 opacity-40 font-bold ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                {msg.timestamp}
              </p>
            </div>
          </div>
        ))}

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
            <p className="text-[11px] font-black text-slate-400 dark:text-white/30 uppercase tracking-[0.2em] px-2">Choisissez une expertise</p>
            {SERVICES.map(s => (
              <button key={s.id} onClick={() => handleServiceSelect(s)} className={`service-button p-4 rounded-[20px] text-left border shadow-sm flex items-center justify-between group ${isDarkMode ? 'bg-[#1C1C1E] border-white/10 hover:border-emerald-500/50' : 'bg-white border-slate-100 hover:border-emerald-500/50'}`}>
                <span className={`font-bold text-[15px] ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{s.name}</span>
                <span className="opacity-0 group-hover:opacity-100 transition-opacity text-emerald-500">→</span>
              </button>
            ))}
          </div>
        )}

        {appState === AppState.FORMATION_CHOICE && !isLoading && (
          <div className="grid gap-3 pt-6 fade-in-up max-w-[340px] mx-auto">
            <button onClick={() => handleFormationOption(false)} className={`flex items-center gap-3 p-4 rounded-[22px] border shadow-sm ${isDarkMode ? 'bg-[#1C1C1E] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-800'}`}>
              <GlobeAltIcon className="w-6 h-6 text-emerald-500" />
              <div className="text-left"><p className="font-black text-xs uppercase tracking-widest">Le Site Web</p><p className="text-[10px] opacity-50">Toutes nos offres</p></div>
            </button>
            <button onClick={() => handleFormationOption(true)} className="flex items-center gap-3 p-4 bg-emerald-600 text-white rounded-[22px] shadow-lg shadow-emerald-500/20">
              <AcademicCapIcon className="w-6 h-6" />
              <div className="text-left"><p className="font-black text-xs uppercase tracking-widest">Sur-mesure</p><p className="text-[10px] opacity-80">Formation privée</p></div>
            </button>
          </div>
        )}

        {(appState === AppState.VALIDATION || appState === AppState.ASK_ANYTHING_ELSE) && !isLoading && (
          <div className="flex gap-3 max-w-[320px] mx-auto pt-6 fade-in-up">
            <button onClick={() => appState === AppState.VALIDATION ? handleValidation(true) : handleAnythingElse(true)} className="flex-1 py-4 bg-emerald-600 text-white rounded-[22px] font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-all">OUI</button>
            <button onClick={() => appState === AppState.VALIDATION ? handleValidation(false) : handleAnythingElse(false)} className={`flex-1 py-4 rounded-[22px] font-black text-xs uppercase tracking-widest border active:scale-95 transition-all ${isDarkMode ? 'bg-[#1C1C1E] border-white/10 text-white/50' : 'bg-white border-slate-200 text-slate-400'}`}>NON</button>
          </div>
        )}

        {appState === AppState.CONTACT_COLLECTION && (
          <form onSubmit={handleContactSubmit} className={`p-6 rounded-[32px] shadow-2xl space-y-4 animate-in zoom-in-95 border ${isDarkMode ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-50'}`}>
            <h3 className="font-black text-center text-[10px] uppercase tracking-[0.3em] mb-4 opacity-40">Vos Coordonnées</h3>
            <div className="space-y-3">
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="text" placeholder="Nom complet" value={contactInfo.fullName} onChange={e => setContactInfo({...contactInfo, fullName: e.target.value})} className={`w-full p-4 pl-12 rounded-[18px] text-sm font-medium outline-none ${isDarkMode ? 'bg-white/5 text-white border border-white/5' : 'bg-slate-100'}`} />
              </div>
              <div className="relative">
                <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="tel" placeholder="Téléphone" value={contactInfo.phone} onChange={e => setContactInfo({...contactInfo, phone: e.target.value})} className={`w-full p-4 pl-12 rounded-[18px] text-sm font-medium outline-none ${isDarkMode ? 'bg-white/5 text-white border border-white/5' : 'bg-slate-100'}`} />
              </div>
              <div className="relative">
                <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input required type="email" placeholder="Email" value={contactInfo.email} onChange={e => setContactInfo({...contactInfo, email: e.target.value})} className={`w-full p-4 pl-12 rounded-[18px] text-sm font-medium outline-none ${isDarkMode ? 'bg-white/5 text-white border border-white/5' : 'bg-slate-100'}`} />
              </div>
            </div>
            <button type="submit" disabled={isEmailSending} className="w-full py-4 bg-emerald-600 text-white rounded-[18px] font-black text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all disabled:opacity-50 mt-4">
              {isEmailSending ? "TRANSMISSION..." : "VALIDER"}
            </button>
          </form>
        )}
        <div ref={messagesEndRef} className="h-6" />
      </main>

      <footer className={`p-4 pb-8 ios-blur border-t transition-colors ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-white/70 border-slate-200'}`}>
        <div className="max-w-3xl mx-auto relative">
          <textarea 
            disabled={isLoading || appState === AppState.CONTACT_COLLECTION || appState === AppState.VALIDATION || appState === AppState.FORMATION_CHOICE || appState === AppState.ASK_ANYTHING_ELSE || appState === AppState.COMPLETED} 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} 
            placeholder={appState === AppState.DESCRIPTION ? "Détaillez votre projet..." : "Un message pour Ruby ?"} 
            className={`w-full p-4 pr-14 rounded-[28px] text-[15px] font-medium outline-none transition-all resize-none max-h-32 border focus:ring-2 focus:ring-emerald-500/20 ${isDarkMode ? 'bg-[#1C1C1E] border-white/10 text-white placeholder:text-white/20' : 'bg-white border-slate-200 text-slate-900 placeholder:text-slate-400'}`} 
            rows={1} 
          />
          <button onClick={() => handleSendMessage()} disabled={!input.trim() || isLoading} className={`absolute right-1.5 bottom-1.5 p-3 rounded-full shadow-lg transition-all active:scale-90 ${!input.trim() ? 'opacity-0' : 'bg-emerald-600 text-white'}`}>
            <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
