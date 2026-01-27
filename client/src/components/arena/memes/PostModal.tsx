import { Modal, Box } from '@mui/material';
import { useState } from 'react';
import { AddPhotoAlternate } from '@mui/icons-material';

interface PostModalProps {
    open: boolean;
    onClose: () => void;
    onPost: (url: string, caption: string) => void;
}

export const PostModal = ({ open, onClose, onPost }: PostModalProps) => {
    const [url, setUrl] = useState('');
    const [legenda, setLegenda] = useState('');

    return (
        <Modal open={open} onClose={onClose} sx={{display:'flex', alignItems:'center', justifyContent:'center', p:4, backdropFilter: 'blur(2px)'}}>
            <Box className="bg-slate-900 border border-purple-500/50 p-6 rounded-3xl w-full max-w-xs outline-none shadow-2xl">
                <h3 className="text-lg font-black text-white uppercase mb-4 flex items-center gap-2">
                    <AddPhotoAlternate className="text-purple-500"/> Novo IPO
                </h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Imagem URL</label>
                        <input type="text" placeholder="https://..." value={url} onChange={e => setUrl(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-purple-500 mt-1" />
                    </div>
                    
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Legenda</label>
                        <input type="text" placeholder="Escreva algo..." value={legenda} onChange={e => setLegenda(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-white text-xs outline-none focus:border-purple-500 mt-1" />
                    </div>

                    {url && (
                        <div className="h-32 rounded-xl overflow-hidden bg-black border border-slate-800">
                            <img src={url} className="w-full h-full object-contain" alt="Preview" onError={(e) => (e.currentTarget.style.display = 'none')} />
                        </div>
                    )}

                    <button onClick={() => onPost(url, legenda)} className="w-full bg-purple-600 hover:bg-purple-500 text-white py-3 rounded-xl font-black text-xs uppercase shadow-lg active:scale-95 transition-all">
                        PUBLICAR ATIVO
                    </button>
                </div>
            </Box>
        </Modal>
    );
};