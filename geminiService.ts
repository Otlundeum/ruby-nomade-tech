
import { Message } from "./types";
import { COMPANY_NAME, SERVICES, CONTACT_PHONE } from "./constants";

/**
 * RUBY LOCAL ENGINE (V2.2)
 * Un moteur de réponse déterministe et intelligent qui fonctionne à 100% en local.
 */

interface IntentResponse {
  keywords: string[];
  response: string | (() => string);
  priority: number;
}

export const getGeminiResponse = async (
  history: Message[],
  _currentTime: string,
  _selectedService?: string
): Promise<string> => {
  // Simulation d'un temps de frappe réaliste (entre 2 et 3.5 secondes)
  const typingDelay = Math.random() * 1500 + 2000;
  await new Promise(resolve => setTimeout(resolve, typingDelay));

  const lastMessage = history.filter(m => m.role === 'user').pop();
  if (!lastMessage) return "Bonjour ! Je suis Ruby. Comment puis-je vous aider aujourd'hui ?";

  const query = lastMessage.content.toLowerCase().trim();

  // 1. DÉTECTION DES INTENTIONS PAR SCORING
  const intents: IntentResponse[] = [
    {
      keywords: ["oumar", "tidiane", "rachid", "otleer", "admin", "boss", "directeur", "responsable", "chef", "où est", "ou est"],
      response: `Mon administrateur Oumar Tidiane est indisponible pour le moment mais vous pouvez le joindre directement sur son numéro : ${CONTACT_PHONE}.`,
      priority: 10
    },
    {
      keywords: ["créé", "créer", "conçu", "fabriqué", "développé", "fait", "qui t'a", "origine", "parent", "papa", "maman", "ton createur", "ton créateur"],
      response: "Je ne peux pas répondre à cette question mais vous pouvez prendre rendez-vous avec mon administrateur Oumar Tidiane pour discuter de cette question.",
      priority: 10
    },
    {
      keywords: ["prix", "tarif", "combien", "coute", "coût", "payer", "argent", "devis", "budget", "facture"],
      response: () => {
        if (query.includes("formation")) {
          return "Pour les formations, vous pouvez consulter les tarifs et payer en toute sécurité sur notre plateforme officielle : www.nomadetech.digital. Pour les autres services, le prix dépend de votre projet. Souhaitez-vous que je transmette vos coordonnées à l'administrateur pour un devis personnalisé ?";
        }
        return "Nos tarifs sont sur-mesure car chaque projet est unique. Souhaitez-vous que je transmette vos coordonnées à l'administrateur Oumar Tidiane pour qu'il vous recontacte avec une proposition chiffrée ?";
      },
      priority: 9
    },
    {
      keywords: ["formation", "apprendre", "cours", "catalogue", "digital", "marketing", "ecommerce"],
      response: "Nous proposons des formations de haut niveau en marketing digital et e-commerce. Vous pouvez explorer notre catalogue complet sur www.nomadetech.digital ou me demander un programme personnalisé ici même !",
      priority: 8
    },
    {
      keywords: ["chatbot", "ia", "intelligence", "automatisé", "agent", "robot"],
      response: "La conception de Chatbots IA est notre spécialité ! Nous créons des agents capables d'automatiser vos ventes et votre support 24h/24. C'est un investissement rentable pour votre image de marque.",
      priority: 8
    },
    {
      keywords: ["où", "adresse", "lieu", "senegal", "dakar", "bureau", "siège"],
      response: `Nomade Technology est basé au Sénégal, mais nous travaillons de manière digitale avec des clients partout dans le monde. La distance n'est pas un frein à l'innovation !`,
      priority: 7
    },
    {
      keywords: ["bonjour", "salut", "hello", "hi", "hey", "ruby"],
      response: "Bonjour ! Je suis Ruby, l'assistante virtuelle de Nomade Technology. Je suis là pour vous guider dans vos projets digitaux. Que souhaitez-vous savoir ?",
      priority: 5
    },
    {
      keywords: ["merci", "super", "cool", "top", "parfait", "ok", "d'accord"],
      response: "C'est un plaisir de vous aider ! Je reste à votre disposition si vous avez la moindre question.",
      priority: 5
    }
  ];

  // Trouver la meilleure correspondance par poids de mots-clés
  let bestMatch: IntentResponse | null = null;
  let maxScore = 0;

  for (const intent of intents) {
    let score = 0;
    intent.keywords.forEach(k => {
      if (query.includes(k)) score += 1;
    });

    if (score > 0 && (score + intent.priority > maxScore)) {
      maxScore = score + intent.priority;
      bestMatch = intent;
    }
  }

  if (bestMatch) {
    return typeof bestMatch.response === 'function' ? bestMatch.response() : bestMatch.response;
  }

  // Fallback si aucun mot-clé n'est détecté
  if (query.length > 3) {
    return "Je comprends votre message. Souhaitez-vous que je transmette vos coordonnées à l'administrateur pour qu'il vous recontacte ?";
  }

  return "Désolée, je n'ai pas bien saisi. Je suis programmée pour aider l'administrateur de Nomade Technology sur les demandes de Chatbots, E-commerce, Formations et Web. Que puis-je faire pour vous ?";
};
