import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { 
  Check, 
  Crown, 
  Zap, 
  ArrowLeft,
  FileBarChart,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    features: [
      { key: 'reports', value: '5 reportes/mes' },
      { key: 'fileSize', value: 'Hasta 5MB' },
      { key: 'rows', value: 'Hasta 50,000 filas' },
    ],
    limitations: [
      'Sin exportar PDF',
      'Sin links compartibles',
      'Sin comparación'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 12,
    popular: true,
    features: [
      { key: 'reports', value: '50 reportes/mes' },
      { key: 'fileSize', value: 'Hasta 100MB' },
      { key: 'rows', value: 'Hasta 1,000,000 filas' },
      { key: 'pdf', value: 'Exportar PDF' },
      { key: 'share', value: 'Links compartibles' },
      { key: 'compare', value: 'Comparación de datasets' },
    ]
  },
  {
    id: 'team',
    name: 'Team',
    price: 29,
    features: [
      { key: 'reports', value: 'Reportes ilimitados' },
      { key: 'fileSize', value: 'Hasta 500MB' },
      { key: 'rows', value: 'Hasta 5,000,000 filas' },
      { key: 'pdf', value: 'Exportar PDF' },
      { key: 'share', value: 'Links compartibles' },
      { key: 'compare', value: 'Comparación de datasets' },
      { key: 'history', value: 'Historial ilimitado' },
    ]
  }
];

export const PricingPage = () => {
  const { user, refreshUser } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [loadingPlan, setLoadingPlan] = useState(null);

  const handleUpgrade = async (planId) => {
    if (planId === 'free' || planId === user?.plan) return;
    
    setLoadingPlan(planId);
    try {
      const response = await axios.post(
        `${API}/checkout`,
        { 
          plan: planId,
          origin_url: window.location.origin
        },
        { withCredentials: true }
      );
      
      // Redirect to Stripe
      window.location.href = response.data.url;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Error al procesar el pago');
      setLoadingPlan(null);
    }
  };

  return (
    <div className="min-h-screen bg-background" data-testid="pricing-page">
      {/* Header */}
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('common.back')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <FileBarChart className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg tracking-tight">DataLens</span>
          </div>
          <div className="w-24" /> {/* Spacer */}
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold tracking-tighter mb-4">
            {language === 'es' ? 'Planes y precios' : 'Plans and pricing'}
          </h1>
          <p className="text-lg text-muted-foreground">
            {language === 'es' 
              ? 'Elige el plan que mejor se adapte a tus necesidades'
              : 'Choose the plan that best fits your needs'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const isCurrentPlan = user?.plan === plan.id;
            const isUpgrade = plan.price > (plans.find(p => p.id === user?.plan)?.price || 0);
            
            return (
              <Card 
                key={plan.id}
                className={`border relative ${
                  plan.popular 
                    ? 'border-primary shadow-lg shadow-primary/20' 
                    : 'border-border'
                }`}
                data-testid={`plan-${plan.id}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="px-3 py-1 bg-primary text-primary-foreground text-xs font-semibold rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      {language === 'es' ? 'Más popular' : 'Most popular'}
                    </span>
                  </div>
                )}
                
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl flex items-center justify-center gap-2">
                    {plan.id !== 'free' && <Crown className="w-5 h-5 text-amber-500" />}
                    {plan.name}
                  </CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-extrabold">${plan.price}</span>
                    {plan.price > 0 && <span className="text-muted-foreground">/mes</span>}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm">
                        <Check className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        {feature.value}
                      </li>
                    ))}
                    {plan.limitations?.map((limitation, idx) => (
                      <li key={`lim-${idx}`} className="flex items-center gap-3 text-sm text-muted-foreground">
                        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                        </div>
                        {limitation}
                      </li>
                    ))}
                  </ul>
                  
                  <Button 
                    className={`w-full ${plan.popular ? '' : 'variant-outline'}`}
                    variant={isCurrentPlan ? 'outline' : plan.popular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || loadingPlan === plan.id || plan.id === 'free'}
                    onClick={() => handleUpgrade(plan.id)}
                    data-testid={`select-plan-${plan.id}`}
                  >
                    {loadingPlan === plan.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isCurrentPlan ? (
                      language === 'es' ? 'Plan actual' : 'Current plan'
                    ) : plan.id === 'free' ? (
                      language === 'es' ? 'Plan gratuito' : 'Free plan'
                    ) : (
                      language === 'es' ? 'Actualizar' : 'Upgrade'
                    )}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-12 text-center text-sm text-muted-foreground">
          <p>
            {language === 'es'
              ? 'Todos los precios están en USD. Los pagos se procesan de forma segura a través de Stripe.'
              : 'All prices are in USD. Payments are securely processed through Stripe.'}
          </p>
        </div>
      </main>
    </div>
  );
};

export default PricingPage;
