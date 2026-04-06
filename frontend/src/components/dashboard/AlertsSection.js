import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { 
  AlertTriangle, 
  AlertCircle, 
  Info, 
  CircleCheck,
  GitBranch,
  Hash,
  Copy,
  CircleAlert
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const categoryIcons = {
  missing: CircleAlert,
  duplicates: Copy,
  cardinality: GitBranch,
  correlation: Hash,
  skewness: AlertCircle,
  constant: AlertCircle
};

const AlertBadge = ({ type, message, column, category }) => {
  const { t } = useLanguage();
  
  const icons = {
    danger: AlertTriangle,
    warning: AlertCircle,
    info: Info,
    success: CircleCheck
  };

  const styles = {
    danger: 'alert-danger border',
    warning: 'alert-warning border',
    info: 'bg-blue-500/10 border-blue-500/30 text-blue-500 border',
    success: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 border'
  };

  const Icon = icons[type] || AlertCircle;
  const CategoryIcon = categoryIcons[category] || AlertCircle;

  return (
    <div 
      className={`p-4 rounded-lg ${styles[type] || styles.info}`}
      data-testid={`alert-${type}-${column || 'general'}`}
    >
      <div className="flex items-start gap-3">
        <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {column && (
              <span className="font-mono text-sm font-medium">{column}</span>
            )}
            <span className="text-xs px-2 py-0.5 rounded-full bg-background/50 flex items-center gap-1">
              <CategoryIcon className="w-3 h-3" />
              {t(`alerts.${category}`) || category}
            </span>
          </div>
          <p className="text-sm">{message}</p>
        </div>
      </div>
    </div>
  );
};

export const AlertsSection = ({ data }) => {
  const { t } = useLanguage();
  
  const alerts = data?.alerts || [];

  const dangerAlerts = alerts.filter(a => a.type === 'danger');
  const warningAlerts = alerts.filter(a => a.type === 'warning');
  const infoAlerts = alerts.filter(a => a.type === 'info');

  if (alerts.length === 0) {
    return (
      <section className="space-y-6" data-testid="alerts-section">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('alerts.title')}</h2>
          <p className="text-muted-foreground">Verificación de calidad de datos</p>
        </div>
        
        <Card className="border border-border bg-emerald-500/5 border-emerald-500/30">
          <CardContent className="py-12 text-center">
            <CircleCheck className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-emerald-500 mb-2">
              ¡Excelente calidad de datos!
            </h3>
            <p className="text-muted-foreground">{t('alerts.noAlerts')}</p>
          </CardContent>
        </Card>
      </section>
    );
  }

  return (
    <section className="space-y-6" data-testid="alerts-section">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{t('alerts.title')}</h2>
          <p className="text-muted-foreground">{alerts.length} problemas detectados</p>
        </div>
        
        {/* Summary badges */}
        <div className="flex gap-2">
          {dangerAlerts.length > 0 && (
            <span className="alert-badge bg-red-500/10 text-red-500">
              <AlertTriangle className="w-3 h-3" />
              {dangerAlerts.length} {t('alerts.critical').toLowerCase()}
            </span>
          )}
          {warningAlerts.length > 0 && (
            <span className="alert-badge bg-amber-500/10 text-amber-500">
              <AlertCircle className="w-3 h-3" />
              {warningAlerts.length} {t('alerts.warning').toLowerCase()}
            </span>
          )}
          {infoAlerts.length > 0 && (
            <span className="alert-badge bg-blue-500/10 text-blue-500">
              <Info className="w-3 h-3" />
              {infoAlerts.length} {t('alerts.info').toLowerCase()}
            </span>
          )}
        </div>
      </div>

      {/* Critical alerts */}
      {dangerAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-red-500 uppercase tracking-wider flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            {t('alerts.critical')} ({dangerAlerts.length})
          </h3>
          <div className="space-y-2">
            {dangerAlerts.map((alert, idx) => (
              <AlertBadge key={`danger-${idx}`} {...alert} />
            ))}
          </div>
        </div>
      )}

      {/* Warning alerts */}
      {warningAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-amber-500 uppercase tracking-wider flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {t('alerts.warning')} ({warningAlerts.length})
          </h3>
          <div className="space-y-2">
            {warningAlerts.map((alert, idx) => (
              <AlertBadge key={`warning-${idx}`} {...alert} />
            ))}
          </div>
        </div>
      )}

      {/* Info alerts */}
      {infoAlerts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-blue-500 uppercase tracking-wider flex items-center gap-2">
            <Info className="w-4 h-4" />
            {t('alerts.info')} ({infoAlerts.length})
          </h3>
          <div className="space-y-2">
            {infoAlerts.map((alert, idx) => (
              <AlertBadge key={`info-${idx}`} {...alert} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
};

export default AlertsSection;
