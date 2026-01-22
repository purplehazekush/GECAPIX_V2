import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Google, GroupAdd } from '@mui/icons-material';

export default function Login() {
  const { signInGoogle } = useAuth();
  const [codigoConvite, setCodigoConvite] = useState('');

  // Precisamos ajustar o AuthContext para aceitar o código, 
  // mas por enquanto vamos passar via localStorage para ser mais simples e rápido
  const handleLogin = async () => {
    if (codigoConvite) {
        localStorage.setItem('gecapix_invite_code', codigoConvite.toUpperCase());
    }
    await signInGoogle();
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 p-6">
      <div className="w-full max-w-sm space-y-8 text-center">
        
        <div>
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 italic">
            GECAPIX
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-2">Arena da Automação</p>
        </div>

        <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          
          {/* CAMPO DE CONVITE */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 font-black uppercase flex items-center justify-center gap-1">
              <GroupAdd sx={{ fontSize: 12 }} /> Possui um código de convite?
            </label>
            <input 
              type="text"
              placeholder="OPCIONAL (EX: JOAO1234)"
              value={codigoConvite}
              onChange={(e) => setCodigoConvite(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-white text-center font-mono focus:border-purple-500 outline-none transition-all"
            />
          </div>

          <button 
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-white text-black font-black py-4 rounded-2xl hover:bg-slate-200 transition-all active:scale-95 shadow-xl"
          >
            <Google /> ENTRAR COM GOOGLE
          </button>
          
          <p className="text-[9px] text-slate-600 leading-relaxed">
            Ao entrar, você concorda com as regras da Arena e o sistema de pontuação GecaCoins.
          </p>
        </div>
      </div>
    </div>
  );
}