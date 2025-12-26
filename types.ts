
export type Role = 'user' | 'assistant';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: string;
}

export enum AppState {
  INITIAL = 'INITIAL',
  SERVICE_SELECTION = 'SERVICE_SELECTION',
  WAITING_FOR_ANSWER = 'WAITING_FOR_ANSWER',
  VALIDATION = 'VALIDATION',
  FORMATION_CHOICE = 'FORMATION_CHOICE',
  DESCRIPTION = 'DESCRIPTION',
  CONTACT_COLLECTION = 'CONTACT_COLLECTION',
  ASK_ANYTHING_ELSE = 'ASK_ANYTHING_ELSE',
  COMPLETED = 'COMPLETED'
}

export interface Service {
  id: string;
  name: string;
  description: string;
}

export interface UserContact {
  fullName: string;
  phone: string;
  email: string;
}

export interface SessionData {
  sessionId: string;
  messages: Message[];
  selectedService?: string;
  description?: string;
  contact?: UserContact;
}
