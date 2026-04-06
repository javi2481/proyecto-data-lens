import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useLanguage } from '../contexts/LanguageContext';
import { OverviewSection } from '../components/dashboard/OverviewSection';
import { VariablesSection } from '../components/dashboard/VariablesSection';
import { CorrelationsSection } from '../components/dashboard/CorrelationsSection';
import { AlertsSection } from '../components/dashboard/AlertsSection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { 
  FileBarChart, 
  LayoutDashboard, 
  Variable, 
  GitBranch, 
  AlertTriangle,
  Loader2,
  AlertCircle
} from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const PublicReportPage = () => {
  const { token } = useParams();
  const { t, language, toggleLanguage } = useLanguage();
  
  const [report, setReport] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await axios.get(`${API}/public/reports/${token}`);
        setReport(response.data);
      } catch (error) {
        setError(error.response?.data?.detail || 'Report not found');
      } finally {
        setIsLoading(false);
      }
    };
    fetchReport();
  }, [token]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="text-muted-foreground">
            {language === 'es' ? 'Cargando reporte...' : 'Loading report...'}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">
            {language === 'es' ? 'Reporte no encontrado' : 'Report not found'}
          </h1>
          <p className="text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  const profileData = report?.profile_data;

  return (
    <div className="min-h-screen bg-background" data-testid="public-report-page">
      {/* Header */}
      <header className="border-b border-border sticky top-0 bg-background z-10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileBarChart className="w-4 h-4 text-primary-foreground" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight">DataLens</span>
              <span className="text-muted-foreground ml-2">/ {report?.filename}</span>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={toggleLanguage}>
            {language === 'es' ? 'EN' : 'ES'}
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
            <TabsTrigger value="overview" data-testid="tab-overview">
              <LayoutDashboard className="w-4 h-4 mr-2" />
              {t('nav.overview')}
            </TabsTrigger>
            <TabsTrigger value="variables" data-testid="tab-variables">
              <Variable className="w-4 h-4 mr-2" />
              {t('nav.variables')}
            </TabsTrigger>
            <TabsTrigger value="correlations" data-testid="tab-correlations">
              <GitBranch className="w-4 h-4 mr-2" />
              {t('nav.correlations')}
            </TabsTrigger>
            <TabsTrigger value="alerts" data-testid="tab-alerts">
              <AlertTriangle className="w-4 h-4 mr-2" />
              {t('nav.alerts')}
              {profileData?.alerts?.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-500 rounded-full">
                  {profileData.alerts.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="animate-fade-in">
            <OverviewSection data={profileData} />
          </TabsContent>
          <TabsContent value="variables" className="animate-fade-in">
            <VariablesSection data={profileData} />
          </TabsContent>
          <TabsContent value="correlations" className="animate-fade-in">
            <CorrelationsSection data={profileData} />
          </TabsContent>
          <TabsContent value="alerts" className="animate-fade-in">
            <AlertsSection data={profileData} />
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 mt-12">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>
            {language === 'es' 
              ? 'Generado con DataLens — Análisis de datos inteligente'
              : 'Generated with DataLens — Intelligent data analysis'}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default PublicReportPage;
