import { useEffect, useState } from 'react';
import { supabase } from '@/lib/customSupabaseClient';

// Lê o modo manutenção da tabela pública `configuracoes_site` (settings.maintenance).
// Fail-open: qualquer erro assume site NO AR, para nunca derrubar a plataforma por engano.
export function useMaintenance() {
  const [state, setState] = useState({ loading: true, enabled: false, message: '' });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const { data } = await supabase.rpc('get_public_site_config');
        const m = data?.maintenance || {};
        if (active) setState({ loading: false, enabled: !!m.enabled, message: m.message || '' });
      } catch {
        if (active) setState({ loading: false, enabled: false, message: '' });
      }
    })();
    return () => { active = false; };
  }, []);

  return state;
}

export default useMaintenance;
