import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function HourlyHeatmap({ data }: { data: any[] }) {
  return (
    <div className="glass-panel p-4 rounded-xl h-80 w-full shadow-lg border border-cyan-500/20">
      <h3 className="text-white font-mono mb-2 flex items-center gap-2 text-sm">
        <span className="text-cyan-400">🔥</span> Comparativo de Horário
      </h3>
      <p className="text-xs text-slate-400 mb-4">Hoje vs. Média do Dia</p>
      
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={data}>
          <XAxis 
            dataKey="hora" 
            tick={{ fill: '#64748b', fontSize: 10 }} 
            axisLine={false} 
            tickLine={false}
            interval={3}
          />
          
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ 
                backgroundColor: '#0f172a', 
                borderColor: '#334155', 
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
            }}
            formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
          />
          
          <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }}/>

          {/* Barra da Média Histórica (Cinza, atrás) */}
          <Bar dataKey="historico" name="Média Esperada" fill="#334155" radius={[2, 2, 0, 0]} barSize={10} />

          {/* Barra de Hoje (Colorida, na frente) */}
          <Bar dataKey="hoje" name="Hoje" fill="#22d3ee" radius={[2, 2, 0, 0]} barSize={10} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}