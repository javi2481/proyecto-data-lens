import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { ChevronDown, ChevronRight, Hash, Type, CircleAlert, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '../ui/collapsible';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import { Badge } from '../ui/badge';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="custom-tooltip">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-mono font-bold">{payload[0].value.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const VariableCard = ({ name, data }) => {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);

  const formatNumber = (num) => {
    if (num === null || num === undefined) return 'N/A';
    if (typeof num !== 'number') return num;
    if (Math.abs(num) >= 1000000) return `${(num / 1000000).toFixed(2)}M`;
    if (Math.abs(num) >= 1000) return `${(num / 1000).toFixed(2)}K`;
    if (Number.isInteger(num)) return num.toLocaleString();
    return num.toFixed(4);
  };

  const getMissingColor = (percent) => {
    if (percent < 5) return 'text-emerald-500';
    if (percent < 20) return 'text-amber-500';
    return 'text-red-500';
  };

  const getTypeIcon = () => {
    return data.is_numeric ? Hash : Type;
  };

  const TypeIcon = getTypeIcon();

  // Prepare histogram data
  const histogramData = data.histogram ? data.histogram.counts.map((count, idx) => ({
    name: `${data.histogram.bin_edges[idx].toFixed(2)}`,
    value: count
  })) : [];

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="border border-border card-hover" data-testid={`variable-card-${name}`}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-muted flex items-center justify-center">
                  <TypeIcon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle className="text-base font-mono">{name}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">{data.type}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className={`text-sm font-medium ${getMissingColor(data.missing_percent)}`}>
                    {data.missing_percent}% {t('variables.missing').toLowerCase()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {data.n_unique} {t('variables.unique').toLowerCase()}
                  </p>
                </div>
                {isOpen ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0 border-t border-border">
            {data.is_numeric ? (
              <div className="space-y-4 pt-4">
                {/* Numeric stats */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">{t('variables.mean')}</p>
                    <p className="font-mono font-medium">{formatNumber(data.mean)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('variables.std')}</p>
                    <p className="font-mono font-medium">{formatNumber(data.std)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('variables.min')}</p>
                    <p className="font-mono font-medium">{formatNumber(data.min)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">{t('variables.max')}</p>
                    <p className="font-mono font-medium">{formatNumber(data.max)}</p>
                  </div>
                </div>

                {/* Quartiles */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Q1 (25%)</p>
                    <p className="font-mono font-medium">{formatNumber(data.q1)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Mediana (50%)</p>
                    <p className="font-mono font-medium">{formatNumber(data.median)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Q3 (75%)</p>
                    <p className="font-mono font-medium">{formatNumber(data.q3)}</p>
                  </div>
                </div>

                {/* Skewness & Kurtosis with tooltips */}
                <div className="grid grid-cols-2 gap-4">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              Skewness <Info className="w-3 h-3" />
                            </p>
                            <p className={`font-mono font-medium ${Math.abs(data.skewness || 0) > 2 ? 'text-amber-500' : ''}`}>
                              {formatNumber(data.skewness)}
                            </p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('tooltip.skewness')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex items-center gap-2 cursor-help">
                          <div>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              Kurtosis <Info className="w-3 h-3" />
                            </p>
                            <p className="font-mono font-medium">{formatNumber(data.kurtosis)}</p>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs">
                        <p>{t('tooltip.kurtosis')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>

                {/* Histogram */}
                {histogramData.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('variables.distribution')}</p>
                    <div className="h-32">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={histogramData}>
                          <XAxis 
                            dataKey="name" 
                            tick={false}
                            axisLine={{ stroke: 'hsl(var(--border))' }}
                          />
                          <YAxis 
                            hide 
                          />
                          <RechartsTooltip content={<CustomTooltip />} />
                          <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                            {histogramData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="hsl(var(--primary))" fillOpacity={0.8} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                {/* Categorical top values */}
                {data.top_values && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{t('variables.topValues')}</p>
                    <div className="space-y-2">
                      {data.top_values.slice(0, 5).map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="font-mono text-sm truncate max-w-[200px]">
                            {item.value || <span className="text-muted-foreground">(vacío)</span>}
                          </span>
                          <Badge variant="secondary" className="font-mono">
                            {item.count.toLocaleString()}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export const VariablesSection = ({ data }) => {
  const { t } = useLanguage();
  const [filter, setFilter] = useState('all');
  
  if (!data?.variables) return null;

  const variables = Object.entries(data.variables);
  
  const filteredVariables = variables.filter(([name, info]) => {
    if (filter === 'all') return true;
    if (filter === 'numeric') return info.is_numeric;
    if (filter === 'categorical') return !info.is_numeric;
    if (filter === 'missing') return info.missing_percent > 0;
    return true;
  });

  const numericCount = variables.filter(([_, v]) => v.is_numeric).length;
  const categoricalCount = variables.filter(([_, v]) => !v.is_numeric).length;
  const missingCount = variables.filter(([_, v]) => v.missing_percent > 0).length;

  return (
    <section className="space-y-6" data-testid="variables-section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('variables.title')}</h2>
          <p className="text-muted-foreground">{variables.length} variables en total</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
          data-testid="filter-all"
        >
          Todas ({variables.length})
        </button>
        <button
          onClick={() => setFilter('numeric')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'numeric' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
          data-testid="filter-numeric"
        >
          Numéricas ({numericCount})
        </button>
        <button
          onClick={() => setFilter('categorical')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            filter === 'categorical' ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'
          }`}
          data-testid="filter-categorical"
        >
          Categóricas ({categoricalCount})
        </button>
        {missingCount > 0 && (
          <button
            onClick={() => setFilter('missing')}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === 'missing' ? 'bg-amber-500 text-white' : 'bg-amber-500/10 text-amber-500 hover:bg-amber-500/20'
            }`}
            data-testid="filter-missing"
          >
            Con faltantes ({missingCount})
          </button>
        )}
      </div>

      {/* Variables grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredVariables.map(([name, info]) => (
          <VariableCard key={name} name={name} data={info} />
        ))}
      </div>
    </section>
  );
};

export default VariablesSection;
