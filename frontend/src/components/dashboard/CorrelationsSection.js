import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Info } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip';

export const CorrelationsSection = ({ data }) => {
  const { t } = useLanguage();
  
  if (!data?.correlations?.pearson) {
    return (
      <section className="space-y-6" data-testid="correlations-section">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('correlations.title')}</h2>
          <p className="text-muted-foreground">{t('correlations.noNumeric')}</p>
        </div>
      </section>
    );
  }

  const { columns, matrix } = data.correlations.pearson;

  const getCorrelationColor = (value) => {
    if (value === null || isNaN(value)) return 'bg-muted';
    const absValue = Math.abs(value);
    if (absValue >= 0.9) return value > 0 ? 'bg-emerald-600' : 'bg-red-600';
    if (absValue >= 0.7) return value > 0 ? 'bg-emerald-500' : 'bg-red-500';
    if (absValue >= 0.5) return value > 0 ? 'bg-emerald-400' : 'bg-red-400';
    if (absValue >= 0.3) return value > 0 ? 'bg-emerald-300' : 'bg-red-300';
    return 'bg-muted';
  };

  const getTextColor = (value) => {
    if (value === null || isNaN(value)) return 'text-muted-foreground';
    const absValue = Math.abs(value);
    if (absValue >= 0.5) return 'text-white';
    return 'text-foreground';
  };

  return (
    <section className="space-y-6" data-testid="correlations-section">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('correlations.title')}</h2>
          <p className="text-muted-foreground">{t('correlations.pearson')}</p>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="text-muted-foreground hover:text-foreground">
                <Info className="w-5 h-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>{t('tooltip.correlation')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Card className="border border-border overflow-hidden" data-testid="correlation-matrix">
        <CardContent className="p-0 overflow-x-auto">
          <div className="min-w-max p-4">
            {/* Header row */}
            <div className="flex">
              <div className="w-24 flex-shrink-0" />
              {columns.map((col) => (
                <div 
                  key={col} 
                  className="w-16 flex-shrink-0 text-xs font-mono text-muted-foreground text-center truncate px-1"
                  title={col}
                >
                  {col.length > 8 ? `${col.slice(0, 6)}...` : col}
                </div>
              ))}
            </div>

            {/* Matrix rows */}
            {matrix.map((row, rowIdx) => (
              <div key={columns[rowIdx]} className="flex items-center">
                <div 
                  className="w-24 flex-shrink-0 text-xs font-mono text-muted-foreground truncate pr-2"
                  title={columns[rowIdx]}
                >
                  {columns[rowIdx].length > 12 ? `${columns[rowIdx].slice(0, 10)}...` : columns[rowIdx]}
                </div>
                {row.map((value, colIdx) => (
                  <TooltipProvider key={colIdx}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div 
                          className={`w-16 h-10 flex-shrink-0 flex items-center justify-center text-xs font-mono font-medium cursor-default transition-transform hover:scale-110 ${getCorrelationColor(value)} ${getTextColor(value)}`}
                        >
                          {value !== null && !isNaN(value) ? value.toFixed(2) : '-'}
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p className="font-mono">
                          {columns[rowIdx]} × {columns[colIdx]}: <strong>{value?.toFixed(4) || 'N/A'}</strong>
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Color legend */}
      <div className="flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-600 rounded" />
          <span>Fuerte negativa</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-muted rounded" />
          <span>Sin correlación</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-emerald-600 rounded" />
          <span>Fuerte positiva</span>
        </div>
      </div>
    </section>
  );
};

export default CorrelationsSection;
