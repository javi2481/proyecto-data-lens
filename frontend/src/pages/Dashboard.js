import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Sidebar } from '../components/Sidebar';
import { FileUpload } from '../components/FileUpload';
import { OverviewSection } from '../components/dashboard/OverviewSection';
import { VariablesSection } from '../components/dashboard/VariablesSection';
import { CorrelationsSection } from '../components/dashboard/CorrelationsSection';
import { AlertsSection } from '../components/dashboard/AlertsSection';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { 
  FileBarChart, 
  LayoutDashboard, 
  Variable, 
  GitBranch, 
  AlertTriangle,
  Download,
  Share2,
  Check,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export const Dashboard = () => {
  const { user, refreshUser } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState(null);
  const [currentReport, setCurrentReport] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [isSharing, setIsSharing] = useState(false);
  const [shareLink, setShareLink] = useState(null);

  // Check for upgrade success
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    const upgrade = searchParams.get('upgrade');
    
    if (sessionId && upgrade === 'success') {
      // Poll for payment status
      const checkPayment = async () => {
        try {
          const response = await axios.get(`${API}/checkout/status/${sessionId}`, {
            withCredentials: true
          });
          if (response.data.payment_status === 'paid') {
            toast.success('¡Upgrade completado! Ahora tienes acceso a todas las funciones Pro.');
            refreshUser();
            // Clean URL
            navigate('/dashboard', { replace: true });
          }
        } catch (error) {
          console.error('Payment check error:', error);
        }
      };
      checkPayment();
    }
  }, [searchParams, navigate, refreshUser]);

  const plan = {
    free: { max_file_size_mb: 5 },
    pro: { max_file_size_mb: 100 },
    team: { max_file_size_mb: 500 }
  }[user?.plan] || { max_file_size_mb: 5 };

  const handleUpload = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      // Upload file
      setUploadProgress(20);
      const uploadResponse = await axios.post(`${API}/upload`, formData, {
        withCredentials: true,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 40) / progressEvent.total);
          setUploadProgress(20 + progress);
        }
      });

      const reportId = uploadResponse.data.report_id;
      setCurrentReport({ report_id: reportId, filename: file.name, status: 'processing' });
      setUploadProgress(60);

      // Start analysis
      const analyzeResponse = await axios.post(`${API}/reports/${reportId}/analyze`, {}, {
        withCredentials: true
      });

      setUploadProgress(100);
      setProfileData(analyzeResponse.data.profile_data);
      setCurrentReport(prev => ({ ...prev, status: 'completed' }));
      
      toast.success('¡Análisis completado!');
    } catch (error) {
      console.error('Upload error:', error);
      const errorMsg = error.response?.data?.detail || 'Error al procesar el archivo';
      setUploadError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleShare = async () => {
    if (!currentReport?.report_id) return;
    
    if (user?.plan === 'free') {
      toast.error('Compartir links es una función Pro. Actualiza tu plan.');
      return;
    }

    setIsSharing(true);
    try {
      const response = await axios.post(
        `${API}/reports/${currentReport.report_id}/share`,
        {},
        { withCredentials: true }
      );
      
      const link = `${window.location.origin}/report/${response.data.public_token}`;
      setShareLink(link);
      await navigator.clipboard.writeText(link);
      toast.success('¡Link copiado al portapapeles!');
    } catch (error) {
      toast.error('Error al generar link');
    } finally {
      setIsSharing(false);
    }
  };

  const handleExportPDF = () => {
    if (user?.plan === 'free') {
      toast.error('Exportar PDF es una función Pro. Actualiza tu plan.');
      return;
    }
    toast.info('Exportación PDF próximamente disponible');
  };

  return (
    <div className="flex h-screen bg-background" data-testid="dashboard">
      <Sidebar />
      
      <main className="flex-1 overflow-auto">
        <div className="p-6 max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">{t('dashboard.title')}</h1>
              <p className="text-muted-foreground">
                {currentReport 
                  ? `Analizando: ${currentReport.filename}`
                  : 'Sube un archivo para comenzar el análisis'}
              </p>
            </div>
            
            {profileData && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleShare}
                  disabled={isSharing}
                  data-testid="share-btn"
                >
                  {shareLink ? <Check className="w-4 h-4 mr-2" /> : <Share2 className="w-4 h-4 mr-2" />}
                  {shareLink ? 'Copiado' : t('export.share')}
                  {user?.plan === 'free' && <Crown className="w-3 h-3 ml-1 text-amber-500" />}
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleExportPDF}
                  data-testid="export-pdf-btn"
                >
                  <Download className="w-4 h-4 mr-2" />
                  {t('export.pdf')}
                  {user?.plan === 'free' && <Crown className="w-3 h-3 ml-1 text-amber-500" />}
                </Button>
              </div>
            )}
          </div>

          {/* Upload or Results */}
          {!profileData ? (
            <FileUpload 
              onUpload={handleUpload}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              error={uploadError}
              maxSizeMB={plan.max_file_size_mb}
            />
          ) : (
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
          )}

          {/* New analysis button */}
          {profileData && (
            <div className="pt-6 border-t border-border">
              <Button 
                variant="outline" 
                onClick={() => {
                  setProfileData(null);
                  setCurrentReport(null);
                  setShareLink(null);
                }}
                data-testid="new-analysis-btn"
              >
                <FileBarChart className="w-4 h-4 mr-2" />
                Nuevo análisis
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
