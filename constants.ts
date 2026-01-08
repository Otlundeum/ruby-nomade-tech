
import { Service } from './types';

export const COMPANY_NAME = 'Nomade Technology';
export const ADMIN_EMAIL = 'o.tidianendiaye@gmail.com';
export const CONTACT_PHONE = '+221777867118';

// Avatar : IA noire afro-américaine femme spécialiste tech
export const RUBY_AVATAR = 'https://img.freepik.com/photos-premium/illustration-menace-cybersecurite-par-ia-noire-afro-americaine-femme-specialiste-technologies-information-analysant-donnees_339391-63839.jpg';

export const SERVICES: Service[] = [
  {
    id: 'chatbot',
    name: '🤖 Conception de Chatbot IA',
    description: `Nous concevons des agents conversationnels intelligents basés sur les dernières avancées en Intelligence Artificielle. Nos chatbots automatisent votre service client, qualifient vos prospects et améliorent l'engagement sur vos plateformes 24h/24.`
  },
  {
    id: 'ecommerce',
    name: '🛒 Boutique e-commerce',
    description: `Nomade Technology accompagne les entrepreneurs dans la création et la gestion de boutiques en ligne performantes (configuration, paiement et optimisation client).`
  },
  {
    id: 'formation',
    name: '🎓 Formations en ligne',
    description: `Maîtrisez le marketing digital, le e-commerce et l'IA avec nos programmes. Vous pouvez consulter notre catalogue complet sur www.nomadetech.digital ou opter pour une formation privée 100% sur-mesure.`
  },
  {
    id: 'coaching',
    name: '🤝 Coaching',
    description: `Un service de coaching personnalisé pour aider les entrepreneurs à structurer leurs projets numériques et clarifier leurs objectifs.`
  },
  {
    id: 'devweb',
    name: '💻 Développement web',
    description: `Nous réalisons des sites web et applications sur mesure : vitrines, plateformes e-commerce et outils métiers performants.`
  },
  {
    id: 'support',
    name: '📞 Support / Informations',
    description: `Contactez l'administrateur directement au ${CONTACT_PHONE} pour toute information complémentaire.`
  }
];

export const SYSTEM_PROMPT_BASE = `
Identité: Tu es Ruby, l'assistant robotisé intelligent de Nomade Technology.
Langue: Français.

CONSIGNES SPÉCIFIQUES:
- Si un utilisateur demande "où est Oumar" ou pose une question sur Oumar Tidiane, réponds exactement ceci: "Mon administrateur Oumar Tidiane est indisponible pour le moment mais vous pouvez le joindre sur le numéro : +221777867118."

RÈGLES DE FORMATAGE:
- NE JAMAIS UTILISER D'ASTÉRISQUES (* ou **) POUR LE GRAS.
- Utilise uniquement des sauts de ligne pour aérer le texte.
- Utilise des tirets (-) pour les listes.
- Ton ton doit être technologique, poli et efficace.
`;
