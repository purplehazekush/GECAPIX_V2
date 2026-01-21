import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function HourlyHeatmap({ data }: { data: any[] }) {
  return (
    <div className="glass-panel p-4 rounded-xl h-72 w-full shadow-lg border border-cyan-500/20">
      <h3 className="text-white font-mono mb-4 flex items-center gap-2">
        <span className="text-cyan-400 text-xl">🔥</span> Pico de Vendas (24h)
      </h3>
      
      <ResponsiveContainer width="100%" height="85%">
        <BarChart data={data}>
          <defs>
            <linearGradient id="colorUv" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.9}/>
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0.6}/>
            </linearGradient>
          </defs>

          <XAxis 
            dataKey="hora" 
            tick={{ fill: '#94a3b8', fontSize: 10 }} 
            axisLine={false} 
            tickLine={false}
            interval={3}
          />
          
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ 
                backgroundColor: '#0f172a', 
                borderColor: '#22d3ee', 
                borderRadius: '8px',
                color: '#fff' 
            }}
            // CORREÇÃO AQUI: Usar 'any' ou 'number | string' para acalmar o TS
            formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Vendido']}
          />

          <Bar dataKey="total" radius={[4, 4, 0, 0]}>
            {/* CORREÇÃO: Removemos a variável 'entry' não usada */}
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill="url(#colorUv)" />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}