import { type User } from '../../types';

interface AvatarProps {
    user?: Partial<User> | null;
    googlePhoto?: string | null;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showLevel?: boolean;
    className?: string;
}

export default function UserAvatar({ user, googlePhoto, size = 'md', showLevel = false, className = '' }: AvatarProps) {
    // Definição de tamanhos
    const sizes = {
        sm: 'w-8 h-8 text-[10px]',
        md: 'w-12 h-12 text-xs',
        lg: 'w-20 h-20 text-sm',
        xl: 'w-32 h-32 text-base'
    };

    // Gera avatar baseado no email (consistente) ou nome
    const seed = user?.email || user?.nome || 'gecapix';
    const diceBearUrl = `https://api.dicebear.com/7.x/notionists/svg?seed=${seed}&backgroundColor=b6e3f4,c0aede,d1d4f9`;

    // Prioridade: Foto Google -> DiceBear
    const imageSrc = googlePhoto || diceBearUrl;

    // Cor da borda baseada no nível (Gamification visual)
    const level = user?.nivel || 1;
    let borderColor = 'border-slate-700';
    if (level >= 5) borderColor = 'border-cyan-500';
    if (level >= 10) borderColor = 'border-purple-500';
    if (level >= 20) borderColor = 'border-yellow-500';

    return (
        <div className={`relative inline-block ${className}`}>
            <div className={`
                rounded-full p-[2px] bg-slate-900 border-2 ${borderColor} 
                ${sizes[size]} overflow-hidden shadow-lg relative z-10
            `}>
                <img 
                    src={imageSrc} 
                    alt="Avatar" 
                    className="w-full h-full object-cover bg-slate-800"
                />
            </div>
            
            {showLevel && (
                <div className="absolute -bottom-1 -right-1 z-20 bg-slate-900 text-white font-black px-1.5 rounded-md border border-slate-700 text-[10px] shadow-sm">
                    LV{level}
                </div>
            )}
        </div>
    );
}