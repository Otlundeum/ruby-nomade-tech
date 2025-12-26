
import { ADMIN_EMAIL } from './constants';

interface EmailData {
  subject: string;
  message: string;
  type: 'message' | 'lead';
  details?: any;
}

/**
 * Service d'envoi d'emails via Formspree.
 * Utilise l'ID de formulaire fourni : mzdpapyp
 */
export const sendEmailToAdmin = async (data: EmailData) => {
  const FORMSPREE_URL = "https://formspree.io/f/mzdpapyp";

  const payload = {
    _subject: `RUBY - ${data.subject}`,
    message: data.message,
    type: data.type,
    ...data.details,
    _replyto: data.details?.email || ADMIN_EMAIL
  };

  try {
    console.log("🚀 Envoi via Formspree...");
    const response = await fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log("✅ Email transmis à Formspree !");
      return true;
    } else {
      const errorData = await response.json();
      console.warn("❌ Erreur Formspree:", errorData);
      return false;
    }
  } catch (error) {
    console.error("❌ Erreur réseau Formspree:", error);
    return false;
  }
};
