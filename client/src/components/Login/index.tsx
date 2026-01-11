// client/src/components/Login/index.tsx
import { LockOutlined } from '@mui/icons-material'; // Ícone do MUI
import { Button, Paper, Typography, Box } from '@mui/material';
import { useAuth } from '../../context/AuthContext';
import GoogleIcon from '@mui/icons-material/Google'; // O MUI tem ícone do Google sim!

export default function Login() {
  const { signInGoogle } = useAuth();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 animate-fade-in">
      
      {/* Título Neon (Mantido do Tailwind pois é muito específico) */}
      <h1 className="font-mono text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 drop-shadow-[0_0_10px_rgba(34,211,238,0.5)] mb-8">
        GECAPIX
      </h1>

      {/* Card usando Paper do MUI com estilização glassmorphism via sx prop ou className */}
      <Paper 
        elevation={10} 
        sx={{ 
          p: 4, 
          borderRadius: 4, 
          bgcolor: 'rgba(255, 255, 255, 0.05)', 
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          maxWidth: 400,
          width: '100%',
          textAlign: 'center',
          color: 'white'
        }}
      >
        <Box className="flex justify-center mb-6">
             <div className="p-3 bg-cyan-500/10 rounded-full">
                <LockOutlined sx={{ fontSize: 40, color: '#22d3ee' }} />
             </div>
        </Box>

        <Typography variant="body2" sx={{ color: '#cbd5e1', fontFamily: 'monospace', mb: 4 }}>
          Acesso restrito ao sistema de vendas
        </Typography>

        <Button 
          variant="contained" 
          fullWidth
          size="large"
          startIcon={<GoogleIcon />}
          onClick={signInGoogle}
          sx={{ 
            bgcolor: 'white', 
            color: '#0f172a', 
            fontWeight: 'bold',
            '&:hover': { bgcolor: '#e2e8f0' }
          }}
        >
          Entrar com Google
        </Button>

        <Box sx={{ mt: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, color: '#64748b' }}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
            Ambiente Seguro • GECAPIX V2.0
          </Typography>
        </Box>

      </Paper>
    </div>
  );
}