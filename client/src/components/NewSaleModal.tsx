import { useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, TextField, InputAdornment, MenuItem 
} from '@mui/material';
import { AttachMoney } from '@mui/icons-material';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  produtos: any[]; // Lista de produtos para o select
}

export default function NewSaleModal({ open, onClose, onSuccess, produtos }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ item: '', valor: '', quantidade: 1 });

  const handleSubmit = async () => {
    if (!form.item || !form.valor) return;
    setLoading(true);

    try {
      await api.post('/vendas/manual', {
        ...form,
        vendedor_nome: user?.displayName || 'Vendedor'
      });
      onSuccess(); // Recarrega o feed
      onClose();   // Fecha o modal
      setForm({ item: '', valor: '', quantidade: 1 }); // Limpa form
    } catch (error) {
      alert('Erro ao salvar venda');
    } finally {
      setLoading(false);
    }
  };

  // Preenche o valor automático se selecionar um produto da lista
  const handleProductChange = (nomeProduto: string) => {
    const prod = produtos.find(p => p.nome === nomeProduto);
    setForm({ 
      ...form, 
      item: nomeProduto, 
      valor: prod ? prod.preco.toString() : form.valor 
    });
  };

  return (
    <Dialog open={open} onClose={onClose} PaperProps={{ className: "glass-panel" }}>
      <DialogTitle className="text-white font-mono">💰 Venda em Dinheiro</DialogTitle>
      <DialogContent className="flex flex-col gap-4 mt-2 min-w-[300px]">
        
        {/* Select de Produtos Inteligente */}
        <TextField
          select
          label="Produto"
          value={form.item}
          onChange={(e) => handleProductChange(e.target.value)}
          variant="filled"
          sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}
          InputLabelProps={{ style: { color: '#94a3b8' } }}
          inputProps={{ style: { color: 'white' } }}
        >
          {produtos.map((p) => (
            <MenuItem key={p._id} value={p.nome}>{p.nome}</MenuItem>
          ))}
          <MenuItem value="Outro">Outro...</MenuItem>
        </TextField>

        {/* Valor (Editável) */}
        <TextField
          label="Valor Total (R$)"
          type="number"
          value={form.valor}
          onChange={e => setForm({...form, valor: e.target.value})}
          variant="filled"
          sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><AttachMoney sx={{ color: '#22d3ee' }}/></InputAdornment>,
            style: { color: 'white' }
          }}
          InputLabelProps={{ style: { color: '#94a3b8' } }}
        />
        
        {/* Quantidade */}
        <TextField
            label="Quantidade"
            type="number"
            value={form.quantidade}
            onChange={e => setForm({...form, quantidade: Number(e.target.value)})}
            variant="filled"
            sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}
            InputLabelProps={{ style: { color: '#94a3b8' } }}
            inputProps={{ style: { color: 'white' } }}
        />

      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ color: '#94a3b8' }}>Cancelar</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disabled={loading}
          sx={{ bgcolor: '#22d3ee', color: '#0f172a', fontWeight: 'bold' }}
        >
          {loading ? 'Salvando...' : 'Confirmar Venda'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}