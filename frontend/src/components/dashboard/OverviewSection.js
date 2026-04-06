import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  Rows3, 
  Columns3, 
  CircleAlert, 
  Copy, 
  HardDrive,
  Hash
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';

const MetricCard = ({ icon: Icon, label, value, subValue, trend }) => (
  <div className="metric-card" data-testid={`metric-${label.toLowerCase().replace(/\s/g, '-')}`}>
    <div className="flex items-start justify-between">
      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      {trend && (
        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
          trend === 'good' ? 'bg-emerald-500/10 text-emerald-500' :
          trend === 'warning' ? 'bg-amber-500/10 text-amber-500' :
          'bg-red-500/10 text-red-500'
        }`}>
          {subValue}
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-2xl font-bold font-mono tracking-tight">{value}</p>
      <p className="text-sm text-muted-foreground mt-1">{label}</p>
    </div>
  </div>
);

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-sm font-medium">{payload[0].name}</p>
        <p className="text-lg font-mono font-bold">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export const OverviewSection = ({ data }) => {
  const { t } = useLanguage();
  
  if (!data?.overview) return null;

  const { overview } = data;
  
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatBytes = (bytes) => {
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
  };

  const getMissingTrend = (percent) => {
    if (percent < 5) return 'good';
    if (percent < 20) return 'warning';
    return 'bad';
  };

  const getDuplicateTrend = (percent) => {
    if (percent < 5) return 'good';
    if (percent < 15) return 'warning';
    return 'bad';
  };

  // Prepare data for column types chart
  const columnTypesData = Object.entries(overview.column_types || {}).map(([type, count]) => ({
    name: type,
    value: count
  }));

  const COLORS = ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  return (
    <section className="space-y-6" data-testid="overview-section">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">{t('overview.title')}</h2>
        <p className="text-muted-foreground">Métricas generales de tu dataset</p>
      </div>

      {/* Main metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard 
          icon={Rows3} 
          label={t('overview.rows')} 
          value={formatNumber(overview.n_rows)}
        />
        <MetricCard 
          icon={Columns3} 
          label={t('overview.columns')} 
          value={overview.n_columns}
        />
        <MetricCard 
          icon={CircleAlert} 
          label={t('overview.missing')} 
          value={`${overview.missing_percent}%`}
          subValue={formatNumber(overview.n_missing)}
          trend={getMissingTrend(overview.missing_percent)}
        />
        <MetricCard 
          icon={Copy} 
          label={t('overview.duplicates')} 
          value={`${overview.duplicate_percent}%`}
          subValue={formatNumber(overview.n_duplicates)}
          trend={getDuplicateTrend(overview.duplicate_percent)}
        />
      </div>

      {/* Secondary row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <MetricCard 
          icon={HardDrive} 
          label={t('overview.memory')} 
          value={formatBytes(overview.memory_size_bytes)}
        />
        <MetricCard 
          icon={Hash} 
          label="Celdas totales" 
          value={formatNumber(overview.n_cells)}
        />
        
        {/* Column types chart */}
        <Card className="border border-border" data-testid="column-types-chart">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('overview.types')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="w-24 h-24">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={columnTypesData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                      dataKey="value"
                    >
                      {columnTypesData.map((entry, index) => (
                        <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1 flex-1">
                {columnTypesData.map((item, index) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-2 h-2 rounded-full" 
                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                      />
                      <span className="font-mono">{item.name}</span>
                    </div>
                    <span className="font-medium">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sample data preview */}
      {data.sample_data && data.sample_data.length > 0 && (
        <Card className="border border-border" data-testid="sample-data-preview">
          <CardHeader>
            <CardTitle className="text-lg">Vista previa de datos</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  {Object.keys(data.sample_data[0]).map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.sample_data.map((row, idx) => (
                  <tr key={idx}>
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="font-mono text-xs">
                        {val === '' || val === null ? <span className="text-muted-foreground">null</span> : String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default OverviewSection;
