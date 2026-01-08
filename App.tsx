
import React, { useState, useEffect, useRef } from 'react';
import { Message, AppState, Service, UserContact } from './types';
import { SERVICES, COMPANY_NAME, CONTACT_PHONE, RUBY_AVATAR } from './constants';
import { getGeminiResponse } from './geminiService';
import { saveMessageToSupabase, saveLeadToSupabase } from './supabaseClient';
import { sendEmailToAdmin } from './emailService';
import { 
  PaperAirplaneIcon, 
  PhoneIcon,
  EnvelopeIcon,
  UserIcon,
  MoonIcon,
  SunIcon,
  ChevronRightIcon,
  ShieldCheckIcon,
  GlobeAltIcon,
  AcademicCapIcon,
  ArrowTopRightOnSquareIcon
} from '@heroicons/react/24/solid';

const MessageContent: React.FC<{ content: string, role: 'user' | 'assistant', isDarkMode: boolean }> = ({ content, role, isDarkMode }) => {
  const text = content || "";
  const cleanContent = text.replace(/[*_]/g, '');
  const parts = cleanContent.split(/(www\.nomadetech\.digital|\+221777867118)/g);
  
  return (
    <div className="text-[15px] leading-relaxed tracking-tight whitespace-pre-line font-medium">
      {parts.map((part, i) => {
        if (part === 'www.nomadetech.digital') {
          return (
            <a key={i} href="https://www.nomadetech.digital" target="_blank" rel="noopener noreferrer" className="font-bold underline text-emerald-600 inline-flex items-center gap-1">
              {part} <ArrowTopRightOnSquareIcon className="w-3 h-3" />
            </a>
          );
        }
        if (part === CONTACT_PHONE) {
          return <a key={i} href={`tel:${CONTACT_PHONE}`} className="font-bold underline text-emerald-600">{part}</a>;
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    const startChat = async () => {
      setIsLoading(true);
      const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      const welcome = `Bonjour je suis Ruby, l'IA de Oumar Tidiane.\n\nQuelle solution de Nomade Technology recherchez-vous aujourd'hui ?`;
      
      setTimeout(() => {
        setMessages([{ id: Date.now().toString(), role: 'assistant', content: welcome, timestamp: timeStr }]);
        setAppState(AppState.SERVICE_SELECTION);
        setIsLoading(false);
        saveMessageToSupabase(sessionId, 'assistant', welcome);
      }, 1000);
    };
    startChat();
  }, [sessionId]);

  const handleSendMessage = async (customText?: string) => {
    const textToSend = customText || input;
    if (!textToSend.trim() || isLoading) return;

    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: textToSend, timestamp: timeStr };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    saveMessageToSupabase(sessionId, userMsg.role, userMsg.content);

    if (appState === AppState.DESCRIPTION) {
      setIsLoading(true);
      setUserDescription(textToSend);
      setTimeout(() => {
        const botMsg = "C'est noté. Souhaitez-vous que je transmette vos coordonnées à Oumar Tidiane pour qu'il puisse vous recontacter ?";
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: botMsg, timestamp: timeStr }]);
        setAppState(AppState.CONFIRM_CONTACT);
        setIsLoading(false);
      }, 1500);
      return;
    }

    setIsLoading(true);
    try {
      const responseText = await getGeminiResponse([...messages, userMsg], timeStr, selectedService?.name);
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: responseText, timestamp: timeStr }]);
      if (responseText.toLowerCase().includes("recontacte") || responseText.toLowerCase().includes("transmette")) {
        setAppState(AppState.CONFIRM_CONTACT);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleServiceClick = (service: Service) => {
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    setSelectedService(service);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: service.name, timestamp: timeStr }]);
    
    setIsLoading(true);
    setTimeout(() => {
      const botMsg = `${service.description}\n\nEst-ce que cette solution vous intéresse ?`;
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: botMsg, timestamp: timeStr }]);
      
      if (service.id === 'formation') {
        setAppState(AppState.FORMATION_CHOICE);
      } else {
        setAppState(AppState.VALIDATION);
      }
      setIsLoading(false);
    }, 1200);
  };

  const handleDecision = (choice: 'YES' | 'NO') => {
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const text = choice === 'YES' ? "Oui, tout à fait" : "Non, pas vraiment";
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, timestamp: timeStr }]);

    if (appState === AppState.VALIDATION) {
      if (choice === 'YES') {
        setIsLoading(true);
        setTimeout(() => {
          const botMsg = "Génial ! Expliquez-moi brièvement votre projet ou votre besoin :";
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: botMsg, timestamp: timeStr }]);
          setAppState(AppState.DESCRIPTION);
          setIsLoading(false);
        }, 1000);
      } else {
        setAppState(AppState.SERVICE_SELECTION);
      }
    } else if (appState === AppState.CONFIRM_CONTACT) {
      if (choice === 'YES') {
        setAppState(AppState.CONTACT_COLLECTION);
      } else {
        setIsLoading(true);
        setTimeout(() => {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Pas de souci ! Je reste à votre disposition. Souhaitez-vous voir nos autres services ?", timestamp: timeStr }]);
          setAppState(AppState.SERVICE_SELECTION);
          setIsLoading(false);
        }, 1000);
      }
    }
  };

  const handleFormationChoice = (type: 'CATALOGUE' | 'PRIVATE') => {
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    if (type === 'CATALOGUE') {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: "Voir le catalogue", timestamp: timeStr }]);
      setIsLoading(true);
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Excellent choix ! Vous pouvez consulter l'ensemble de nos programmes sur www.nomadetech.digital.\n\nSouhaitez-vous quand même être recontacté pour une formation sur-mesure ?", timestamp: timeStr }]);
        setAppState(AppState.VALIDATION);
        setIsLoading(false);
      }, 1000);
    } else {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: "Formation privée sur-mesure", timestamp: timeStr }]);
      setIsLoading(true);
      setTimeout(() => {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: "Parfait. Les formations privées permettent un accompagnement 100% personnalisé.\n\nDécrivez-moi ce que vous aimeriez apprendre :", timestamp: timeStr }]);
        setAppState(AppState.DESCRIPTION);
        setIsLoading(false);
      }, 1000);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEmailSending(true);
    setIsLoading(true);
    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    try {
      await saveLeadToSupabase(sessionId, contactInfo, selectedService?.name || 'Contact Direct', userDescription);
      await sendEmailToAdmin({
        subject: `NOUVEAU LEAD : ${contactInfo.fullName}`,
        message: `Nom: ${contactInfo.fullName}\nTel: ${contactInfo.phone}\nEmail: ${contactInfo.email}\nService: ${selectedService?.name}\nDescription: ${userDescription}`,
        type: 'lead',
        details: contactInfo
      });
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: `C'est envoyé ! Merci ${contactInfo.fullName}. Oumar Tidiane vous recontactera très prochainement au ${contactInfo.phone}.`,
        timestamp: timeStr
      }]);
      setAppState(AppState.COMPLETED);
    } finally {
      setIsEmailSending(false);
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col h-[100dvh] transition-colors duration-700 overflow-hidden ${isDarkMode ? 'bg-black text-white' : 'bg-[#F9FAFB] text-slate-900'}`}>
      <header className={`ios-blur border-b p-4 flex items-center justify-between sticky top-0 z-50 ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-white/80 border-slate-100 shadow-sm'}`}>
        <div className="flex items-center gap-3.5">
          <div className="relative online-pulse">
            <div className={`w-11 h-11 rounded-full overflow-hidden border-2 shadow-sm ${isDarkMode ? 'border-white/10' : 'border-white'}`}>
              <img src={RUBY_AVATAR} alt="Ruby" className="w-full h-full object-cover" />
            </div>
          </div>
          <div>
            <h1 className="font-extrabold text-[15px] tracking-tight">Ruby</h1>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-wider">en ligne</p>
            </div>
          </div>
        </div>
        <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-full ${isDarkMode ? 'bg-white/10 text-yellow-400' : 'bg-slate-100/80 text-slate-500'}`}>
          {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
        </button>
      </header>

      <main className="flex-1 overflow-y-auto p-5 space-y-6 hide-scrollbar">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} fade-in-up`}>
            <div className={`max-w-[85%] px-5 py-4 ${
              msg.role === 'user' 
                ? 'bg-gradient-to-br from-[#065F46] via-[#10B981] to-[#047857] text-white rounded-[22px] rounded-br-none shadow-lg' 
                : (isDarkMode ? 'bg-[#1C1C1E] text-white rounded-[20px] rounded-bl-sm border border-white/5' : 'bg-white text-slate-800 rounded-[20px] rounded-bl-sm premium-shadow border border-slate-50')
            }`}>
              <MessageContent content={msg.content} role={msg.role} isDarkMode={isDarkMode} />
              <p className="text-[9px] mt-2 font-semibold opacity-30 uppercase">{msg.timestamp}</p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start fade-in-up">
             <div className={`px-5 py-3.5 rounded-[20px] rounded-bl-sm ${isDarkMode ? 'bg-[#1C1C1E]' : 'bg-white premium-shadow'}`}>
                <div className="typing-wave text-emerald-500"><div className="typing-dot"></div><div className="typing-dot"></div><div className="typing-dot"></div></div>
             </div>
          </div>
        )}

        {appState === AppState.SERVICE_SELECTION && !isLoading && (
          <div className="grid gap-3 pt-4 fade-in-up">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Choisissez une expertise</p>
            {SERVICES.map(s => (
              <button key={s.id} onClick={() => handleServiceClick(s)} className={`p-5 rounded-[24px] text-left border flex items-center justify-between transition-all active:scale-[0.98] ${isDarkMode ? 'bg-[#1C1C1E] border-white/5' : 'bg-white border-slate-100 premium-shadow hover:bg-emerald-50/30'}`}>
                <span className="font-bold text-[14px]">{s.name}</span>
                <ChevronRightIcon className="w-5 h-5 text-slate-300" />
              </button>
            ))}
          </div>
        )}

        {appState === AppState.FORMATION_CHOICE && !isLoading && (
          <div className="space-y-3 pt-2 fade-in-up">
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Quelle option préférez-vous ?</p>
             <div className="grid grid-cols-1 gap-3">
                <button onClick={() => handleFormationChoice('CATALOGUE')} className={`p-5 rounded-[24px] text-left border flex items-center gap-4 transition-all active:scale-[0.98] ${isDarkMode ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-emerald-50 border-emerald-100 shadow-sm'}`}>
                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0">
                    <GlobeAltIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-[14px]">Consulter le catalogue</div>
                    <div className="text-[11px] opacity-60">Accès direct au site web</div>
                  </div>
                </button>
                <button onClick={() => handleFormationChoice('PRIVATE')} className={`p-5 rounded-[24px] text-left border flex items-center gap-4 transition-all active:scale-[0.98] ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="w-10 h-10 bg-slate-100 dark:bg-white/10 text-slate-600 dark:text-white rounded-xl flex items-center justify-center shrink-0">
                    <AcademicCapIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-[14px]">Formation privée</div>
                    <div className="text-[11px] opacity-60">Accompagnement 100% sur-mesure</div>
                  </div>
                </button>
             </div>
          </div>
        )}

        {(appState === AppState.VALIDATION || appState === AppState.CONFIRM_CONTACT) && !isLoading && (
          <div className="flex gap-4 pt-2 fade-in-up">
            <button onClick={() => handleDecision('YES')} className="flex-1 py-4 bg-emerald-600 text-white rounded-[22px] font-bold text-xs shadow-lg active:scale-95 transition-transform">OUI</button>
            <button onClick={() => handleDecision('NO')} className={`flex-1 py-4 rounded-[22px] font-bold text-xs border active:scale-95 transition-transform ${isDarkMode ? 'bg-[#1C1C1E] border-white/10 text-white/50' : 'bg-white text-slate-400 border-slate-100'}`}>NON</button>
          </div>
        )}

        {appState === AppState.CONTACT_COLLECTION && (
          <div className="fade-in-up pt-2">
            <form onSubmit={handleContactSubmit} className={`overflow-hidden rounded-[32px] border transition-all ${isDarkMode ? 'bg-[#1C1C1E] border-white/10' : 'bg-white border-slate-100 shadow-2xl'}`}>
              <div className="p-6 border-b border-slate-50 dark:border-white/5 bg-emerald-50/30 dark:bg-white/5 flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
                    <ShieldCheckIcon className="w-7 h-7" />
                </div>
                <div>
                    <h3 className="font-extrabold text-[17px] tracking-tight">Finalisons ensemble</h3>
                    <p className="text-[12px] opacity-60 font-medium">Oumar Tidiane vous recontactera</p>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-600 ml-1">Prénom & Nom complet</label>
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input required type="text" placeholder="Ex: Oumar Tidiane" value={contactInfo.fullName} onChange={e => setContactInfo({...contactInfo, fullName: e.target.value})} className={`w-full p-4 pl-12 rounded-[18px] text-sm font-semibold outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-emerald-500/40'}`} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-600 ml-1">Numéro de téléphone</label>
                    <div className="relative">
                        <PhoneIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input required type="tel" placeholder="+221 ..." value={contactInfo.phone} onChange={e => setContactInfo({...contactInfo, phone: e.target.value})} className={`w-full p-4 pl-12 rounded-[18px] text-sm font-semibold outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-emerald-500/40'}`} />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-[0.1em] text-emerald-600 ml-1">Email de contact</label>
                    <div className="relative">
                        <EnvelopeIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input required type="email" placeholder="votre@email.com" value={contactInfo.email} onChange={e => setContactInfo({...contactInfo, email: e.target.value})} className={`w-full p-4 pl-12 rounded-[18px] text-sm font-semibold outline-none border transition-all ${isDarkMode ? 'bg-white/5 border-white/10 text-white focus:border-emerald-500' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-emerald-500/40'}`} />
                    </div>
                </div>

                <button type="submit" disabled={isEmailSending} className="w-full mt-2 py-4.5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-[22px] font-extrabold text-[14px] uppercase tracking-widest shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50">
                  {isEmailSending ? "ENVOI EN COURS..." : "CONFIRMER L'ENVOI"}
                </button>
              </div>
            </form>
          </div>
        )}
        <div ref={messagesEndRef} className="h-8" />
      </main>

      <footer className={`p-4 pb-10 ios-blur border-t ${isDarkMode ? 'bg-black/60 border-white/10' : 'bg-white/90 border-slate-100'}`}>
        <div className="max-w-4xl mx-auto relative flex items-end gap-2">
          <textarea 
            disabled={isLoading || appState === AppState.CONTACT_COLLECTION || appState === AppState.COMPLETED} 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSendMessage())} 
            placeholder={appState === AppState.DESCRIPTION ? "Décrivez votre besoin..." : "Dites quelque chose à Ruby..."} 
            className={`flex-1 p-4 rounded-[26px] text-sm font-semibold outline-none border transition-all resize-none max-h-32 ${isDarkMode ? 'bg-white/5 border-white/10 text-white' : 'bg-slate-50 border-slate-100 focus:bg-white focus:border-emerald-500/30 shadow-inner'}`} 
            rows={1} 
          />
          <button onClick={() => handleSendMessage()} disabled={!input.trim() || isLoading} className={`p-4 rounded-full transition-all ${!input.trim() ? 'opacity-30' : 'bg-emerald-600 text-white shadow-md active:scale-90'}`}>
            <PaperAirplaneIcon className="w-5 h-5 -rotate-45" />
          </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
