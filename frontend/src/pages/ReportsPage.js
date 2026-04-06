import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Sidebar } from '../components/Sidebar';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  FileStack, 
  FileSpreadsheet, 
  File,
  Trash2,
  Eye,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '../components/ui/alert-dialog';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const fileTypeIcons = {
  csv: FileSpreadsheet,
  xlsx: FileSpreadsheet,
  xls: FileSpreadsheet,
  json: File,
  parquet: File
};

const statusConfig = {
  pending: { icon: Clock, color: 'text-amber-500', label: 'Pendiente' },
  processing: { icon: Loader2, color: 'text-blue-500', label: 'Procesando', animate: true },
  completed: { icon: CheckCircle, color: 'text-emerald-500', label: 'Completado' },
  failed: { icon: XCircle, color: 'text-red-500', label: 'Error' }
};

export const ReportsPage = () => {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/reports`, { withCredentials: true });
      setReports(response.data);
    } catch (error) {
      toast.error('Error al cargar reportes');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (reportId) => {
    try {
      await axios.delete(`${API}/reports/${reportId}`, { withCredentials: true });
      setReports(reports.filter(r => r.report_id !== reportId));
      toast.success('Reporte eliminado');
    } catch (error) {
      toast.error('Error al eliminar reporte');
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(language === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="flex h-screen bg-background" data-testid="reports-page">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('nav.reports')}</h1>
              <p className="text-muted-foreground">
                {reports.length} {language === 'es' ? 'reportes' : 'reports'}
              </p>
            </div>
            <Button variant="outline" onClick={fetchReports} disabled={isLoading}>
              <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {language === 'es' ? 'Actualizar' : 'Refresh'}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : reports.length === 0 ? (
            <Card className="border border-border">
              <CardContent className="py-16 text-center">
                <FileStack className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">{t('dashboard.noReports')}</h3>
                <p className="text-muted-foreground mb-6">{t('dashboard.uploadFirst')}</p>
                <Button onClick={() => navigate('/dashboard')}>
                  {t('dashboard.upload')}
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {reports.map((report) => {
                const FileIcon = fileTypeIcons[report.file_type] || File;
                const status = statusConfig[report.status] || statusConfig.pending;
                const StatusIcon = status.icon;

                return (
                  <Card 
                    key={report.report_id} 
                    className="border border-border card-hover"
                    data-testid={`report-${report.report_id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                          <FileIcon className="w-6 h-6 text-muted-foreground" />
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium truncate">{report.filename}</h3>
                            <span className={`file-badge file-badge-${report.file_type}`}>
                              {report.file_type.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span>{formatFileSize(report.file_size)}</span>
                            <span>{formatDate(report.created_at)}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className={`flex items-center gap-1.5 text-sm ${status.color}`}>
                            <StatusIcon className={`w-4 h-4 ${status.animate ? 'animate-spin' : ''}`} />
                            {status.label}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {report.status === 'completed' && (
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => navigate(`/dashboard?report=${report.report_id}`)}
                              data-testid={`view-report-${report.report_id}`}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                          )}
                          
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                data-testid={`delete-report-${report.report_id}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {language === 'es' ? '¿Eliminar reporte?' : 'Delete report?'}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {language === 'es' 
                                    ? 'Esta acción no se puede deshacer. El reporte será eliminado permanentemente.'
                                    : 'This action cannot be undone. The report will be permanently deleted.'}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleDelete(report.report_id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  {t('common.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;
