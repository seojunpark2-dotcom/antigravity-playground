import { createClient } from '@supabase/supabase-js';
import config from '../auth-config.json';
import { mountAuth } from './auth-ui.js';

const client = createClient(config.url, config.publishableKey, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'antigravity-auth' }
});
mountAuth(client.auth, document, window);
