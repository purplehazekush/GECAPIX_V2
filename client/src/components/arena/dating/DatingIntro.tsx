// client/src/components/arena/dating/DatingIntro.tsx
import { Favorite } from '@mui/icons-material';

interface DatingIntroProps {
    onAccept: () => void;
    onDecline: () => void;
}

export const DatingIntro = ({ onAccept, onDecline }: DatingIntroProps) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
            <div className="bg-slate-900 border border-purple-500/50 rounded-3xl p-6 max-w-sm w-full shadow-[0_0_50px_rgba(168,85,247,0.2)] relative overflow-hidden">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 p-10 bg-purple-600/20 blur-3xl rounded-full -mr-10 -mt-10"></div>
                
                <div className="text-center mb-6 relative z-10">
                    <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                        <Favorite style={{ fontSize: 40 }} className="text-white animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-black text-white italic uppercase">GecaMatch</h2>
                    <p className="text-xs text-purple-300 font-bold uppercase tracking-widest">Protocolo de Socialização</p>
                </div>

                <div className="space-y-4 text-sm text-slate-300 mb-8 relative z-10 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                    <p>🔥 <strong>Game On:</strong> Encontre outros alunos para amizade, estudos ou algo mais.</p>
                    <p>🛡️ <strong>Privacidade:</strong> Seu telefone só é revelado se der <strong>MATCH</strong>.</p>
                    <p>💰 <strong>Economia:</strong> Dar Likes custa Coins. Super Likes custam Glue.</p>
                    <p>⚠️ <strong>Regra de Ouro:</strong> Respeito acima de tudo. Assédio gera banimento permamente do jogo.</p>
                </div>

                <div className="grid grid-cols-2 gap-3 relative z-10">
                    <button 
                        onClick={onDecline}
                        className="py-3 rounded-xl border border-slate-700 text-slate-400 font-bold text-xs hover:bg-slate-800 transition-colors"
                    >
                        CANCELAR
                    </button>
                    <button 
                        onClick={onAccept}
                        className="py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-black text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all"
                    >
                        ENTRAR NO GAME
                    </button>
                </div>
            </div>
        </div>
    );
};