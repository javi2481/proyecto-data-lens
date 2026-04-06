import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Sidebar } from '../components/Sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  GitCompare, 
  ArrowRight, 
  Plus, 
  Minus, 
  AlertCircle,
  CheckCircle,
  Crown,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const ComparePage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  
  const [reports, setReports] = useState([]);
  const [reportA, setReportA] = useState(null);
  const [reportB, setReportB] = useState(null);
  const [comparison, setComparison] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/reports`, { withCredentials: true });
      const completedReports = response.data.filter(r => r.status === 'completed');
      setReports(completedReports);
    } catch (error) {
      toast.error('Error al cargar reportes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!reportA || !reportB) {
      toast.error('Selecciona ambos datasets');
      return;
    }

    if (user?.plan === 'free') {
      toast.error('La comparación es una función Pro. Actualiza tu plan.');
      return;
    }

    setIsComparing(true);
    try {
      const response = await axios.post(
        `${API}/compare?report_a_id=${reportA}&report_b_id=${reportB}`,
        {},
        { withCredentials: true }
      );
      setComparison(response.data.comparison);
      toast.success('Comparación completada');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error en la comparación');
    } finally {
      setIsComparing(false);
    }
  };

  const getStatusColor = (change) => {
    if (!change || change === 0) return 'text-muted-foreground';
    if (change > 0) return 'text-red-500';
    return 'text-emerald-500';
  };

  const getStatusIcon = (type) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-4 h-4 text-emerald-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-amber-500" />;
      case 'danger': return <AlertCircle className="w-4 h-4 text-red-500" />;
      default: return null;
    }
  };

  if (user?.plan === 'free') {
    return (
      <div className="flex h-screen bg-background" data-testid="compare-page">
        <Sidebar />
        <main className="flex-1 overflow-auto">
          <div className="p-6 max-w-4xl mx-auto">
            <Card className="border border-border text-center py-16">
              <CardContent>
                <Crown className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold mb-2">
                  {language === 'es' ? 'Función Pro' : 'Pro Feature'}
                </h2>
                <p className="text-muted-foreground mb-6">
                  {language === 'es' 
                    ? 'La comparación de datasets está disponible en el plan Pro.'
                    : 'Dataset comparison is available on the Pro plan.'}
                </p>
                <Button onClick={() => window.location.href = '/pricing'}>
                  {t('pricing.upgrade')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background" data-testid="compare-page">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{t('compare.title')}</h1>
            <p className="text-muted-foreground">
              {language === 'es' 
                ? 'Compara dos versiones de tu dataset para detectar cambios'
                : 'Compare two versions of your dataset to detect changes'}
            </p>
          </div>

          {/* Selection */}
          <Card className="border border-border">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1 w-full">
                  <label className="text-sm font-medium mb-2 block">
                    {t('compare.selectFirst')}
                  </label>
                  <Select value={reportA} onValueChange={setReportA}>
                    <SelectTrigger data-testid="select-report-a">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {reports.map((report) => (
                        <SelectItem 
                          key={report.report_id} 
                          value={report.report_id}
                          disabled={report.report_id === reportB}
                        >
                          {report.filename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                    <ArrowRight className="w-5 h-5" />
                  </div>
                </div>

                <div className="flex-1 w-full">
                  <label className="text-sm font-medium mb-2 block">
                    {t('compare.selectSecond')}
                  </label>
                  <Select value={reportB} onValueChange={setReportB}>
                    <SelectTrigger data-testid="select-report-b">
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      {reports.map((report) => (
                        <SelectItem 
                          key={report.report_id} 
                          value={report.report_id}
                          disabled={report.report_id === reportA}
                        >
                          {report.filename}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleCompare}
                  disabled={!reportA || !reportB || isComparing}
                  className="md:mt-6"
                  data-testid="compare-btn"
                >
                  {isComparing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <GitCompare className="w-4 h-4 mr-2" />
                  )}
                  {t('compare.run')}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {comparison && (
            <div className="space-y-6 animate-fade-in">
              {/* Overview changes */}
              <Card className="border border-border">
                <CardHeader>
                  <CardTitle>Cambios en el dataset</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Filas</p>
                      <p className={`text-2xl font-bold font-mono ${getStatusColor(comparison.overview.rows_diff)}`}>
                        {comparison.overview.rows_diff > 0 ? '+' : ''}{comparison.overview.rows_diff.toLocaleString()}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">Columnas</p>
                      <p className={`text-2xl font-bold font-mono ${getStatusColor(comparison.overview.columns_diff)}`}>
                        {comparison.overview.columns_diff > 0 ? '+' : ''}{comparison.overview.columns_diff}
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">% Faltantes</p>
                      <p className={`text-2xl font-bold font-mono ${getStatusColor(comparison.overview.missing_diff)}`}>
                        {comparison.overview.missing_diff > 0 ? '+' : ''}{comparison.overview.missing_diff.toFixed(2)}%
                      </p>
                    </div>
                    <div className="p-4 rounded-lg bg-muted/50">
                      <p className="text-sm text-muted-foreground">% Duplicados</p>
                      <p className={`text-2xl font-bold font-mono ${getStatusColor(comparison.overview.duplicates_diff)}`}>
                        {comparison.overview.duplicates_diff > 0 ? '+' : ''}{comparison.overview.duplicates_diff.toFixed(2)}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Column changes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {comparison.columns.added.length > 0 && (
                  <Card className="border border-emerald-500/30 bg-emerald-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-emerald-500">
                        <Plus className="w-4 h-4" />
                        {t('compare.added')} ({comparison.columns.added.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {comparison.columns.added.map((col) => (
                          <span key={col} className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-500 text-sm font-mono">
                            {col}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {comparison.columns.removed.length > 0 && (
                  <Card className="border border-red-500/30 bg-red-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-red-500">
                        <Minus className="w-4 h-4" />
                        {t('compare.removed')} ({comparison.columns.removed.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {comparison.columns.removed.map((col) => (
                          <span key={col} className="px-2 py-1 rounded bg-red-500/10 text-red-500 text-sm font-mono">
                            {col}
                          </span>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Detailed changes */}
              {comparison.changes.length > 0 && (
                <Card className="border border-border">
                  <CardHeader>
                    <CardTitle>{t('compare.changes')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {comparison.changes.map((change, idx) => (
                        <div key={idx} className="p-4 rounded-lg border border-border">
                          <p className="font-mono font-medium mb-2">{change.column}</p>
                          <div className="space-y-1">
                            {change.alerts.map((alert, alertIdx) => (
                              <div key={alertIdx} className="flex items-center gap-2 text-sm">
                                {getStatusIcon(alert.type)}
                                <span className="text-muted-foreground">{alert.metric}:</span>
                                <span className="font-mono">{alert.before?.toFixed?.(2) || alert.before}</span>
                                <ArrowRight className="w-3 h-3" />
                                <span className="font-mono">{alert.after?.toFixed?.(2) || alert.after}</span>
                                {alert.change_percent && (
                                  <span className={`text-xs ${alert.change_percent > 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                    ({alert.change_percent > 0 ? '+' : ''}{alert.change_percent.toFixed(1)}%)
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Empty state */}
          {!comparison && reports.length === 0 && !isLoading && (
            <Card className="border border-border">
              <CardContent className="py-16 text-center">
                <GitCompare className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  {language === 'es' ? 'No hay reportes para comparar' : 'No reports to compare'}
                </h3>
                <p className="text-muted-foreground">
                  {language === 'es' 
                    ? 'Primero analiza al menos dos archivos desde el dashboard'
                    : 'First analyze at least two files from the dashboard'}
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default ComparePage;
