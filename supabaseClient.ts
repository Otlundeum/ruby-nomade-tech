
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://qcdgezudclcmmigaovdt.supabase.co';
const supabaseAnonKey = 'sb_publishable_hvbrerbALa5Zm-fBHNXH-w_RXYa0sKx';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const saveMessageToSupabase = async (sessionId: string, role: string, content: string) => {
  if (!supabase) return;
  try {
    await supabase.from('messages').insert([{ session_id: sessionId, role, content }]);
  } catch (err) {}
};

export const saveLeadToSupabase = async (sessionId: string, contact: any, service: string, description: string) => {
  if (!supabase) return;
  try {
    const { error } = await supabase
      .from('leads')
      .insert([{ 
        session_id: sessionId, 
        full_name: contact.fullName, 
        email: contact.email, 
        phone: contact.phone, 
        service: service, 
        description: description 
      }]);
    if (!error) console.log("Lead enregistré !");
  } catch (err) {}
};
