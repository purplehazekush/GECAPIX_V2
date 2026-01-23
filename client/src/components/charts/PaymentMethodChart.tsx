// client/src/components/charts/PaymentMethodChart.tsx
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const COLORS = ['#22d3ee', '#34d399']; // Cyan (Pix) e Green (Dinheiro)

export default function PaymentMethodChart({ data }: { data: any[] }) {
  return (
    <div className="glass-panel p-4 rounded-xl h-80">
      <h3 className="text-white font-mono mb-4 text-center">Formas de Pagamento</h3>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
            itemStyle={{ color: '#fff' }}
            // CORREÇÃO AQUI: Usar 'any'
            formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
          />
          <Legend verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}