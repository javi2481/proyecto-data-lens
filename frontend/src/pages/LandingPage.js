import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { FileBarChart, BarChart3, Shield, Zap, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/button';

export const LandingPage = () => {
  const { login } = useAuth();
  const { t, language, toggleLanguage } = useLanguage();

  const features = [
    {
      icon: FileBarChart,
      title: language === 'es' ? 'Análisis Automático' : 'Automatic Analysis',
      description: language === 'es' 
        ? 'Sube tu archivo y obtén estadísticas completas en segundos'
        : 'Upload your file and get complete statistics in seconds'
    },
    {
      icon: BarChart3,
      title: language === 'es' ? 'Visualizaciones Interactivas' : 'Interactive Visualizations',
      description: language === 'es'
        ? 'Histogramas, correlaciones y distribuciones interactivas'
        : 'Histograms, correlations and interactive distributions'
    },
    {
      icon: Shield,
      title: language === 'es' ? 'Alertas de Calidad' : 'Quality Alerts',
      description: language === 'es'
        ? 'Detecta valores faltantes, duplicados y anomalías automáticamente'
        : 'Detect missing values, duplicates and anomalies automatically'
    },
    {
      icon: Zap,
      title: language === 'es' ? 'Comparación de Datasets' : 'Dataset Comparison',
      description: language === 'es'
        ? 'Compara versiones de tus datos y detecta cambios'
        : 'Compare versions of your data and detect changes'
    }
  ];

  return (
    <div className="min-h-screen bg-background" data-testid="landing-page">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center">
              <FileBarChart className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-xl tracking-tight">DataLens</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} data-testid="lang-toggle">
              {language === 'es' ? 'EN' : 'ES'}
            </Button>
            <Button onClick={login} data-testid="login-btn">
              {t('auth.loginWithGoogle')}
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-7xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-8">
          <Zap className="w-4 h-4" />
          {language === 'es' ? 'Análisis de datos sin código' : 'No-code data analysis'}
        </div>
        
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tighter mb-6">
          {language === 'es' 
            ? 'Analiza tus datos en segundos' 
            : 'Analyze your data in seconds'}
        </h1>
        
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          {language === 'es'
            ? 'DataLens convierte cualquier archivo CSV, Excel o JSON en un dashboard interactivo con estadísticas, correlaciones y alertas de calidad.'
            : 'DataLens turns any CSV, Excel or JSON file into an interactive dashboard with statistics, correlations and quality alerts.'}
        </p>
        
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" onClick={login} className="text-lg px-8" data-testid="hero-cta">
            {language === 'es' ? 'Comenzar gratis' : 'Start for free'}
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-muted-foreground">
            {language === 'es' ? 'No requiere tarjeta de crédito' : 'No credit card required'}
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature, idx) => (
            <div 
              key={idx}
              className="p-6 rounded-xl border border-border bg-card hover:border-primary/40 transition-colors"
              data-testid={`feature-${idx}`}
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Supported formats */}
      <section className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight mb-4">
          {language === 'es' ? 'Formatos soportados' : 'Supported formats'}
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {['CSV', 'XLSX', 'XLS', 'JSON', 'Parquet'].map((format) => (
            <span 
              key={format}
              className="px-4 py-2 rounded-lg bg-muted font-mono text-sm font-medium"
            >
              .{format.toLowerCase()}
            </span>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16">
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 p-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            {language === 'es' 
              ? '¿Listo para analizar tus datos?' 
              : 'Ready to analyze your data?'}
          </h2>
          <p className="text-muted-foreground mb-8">
            {language === 'es'
              ? 'Comienza gratis con hasta 5 reportes por mes'
              : 'Start free with up to 5 reports per month'}
          </p>
          <Button size="lg" onClick={login} data-testid="cta-btn">
            {t('auth.loginWithGoogle')}
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-sm text-muted-foreground">
          <p>© 2026 DataLens. {language === 'es' ? 'Todos los derechos reservados.' : 'All rights reserved.'}</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
