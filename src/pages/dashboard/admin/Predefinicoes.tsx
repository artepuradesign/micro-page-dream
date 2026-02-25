import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Settings, Save, Loader2, Globe, MessageCircle, Shield, DollarSign, Users, RefreshCw, ArrowLeft } from 'lucide-react';
import { systemConfigAdminService, SystemConfigItem } from '@/services/systemConfigAdminService';
import { useNavigate } from 'react-router-dom';

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  general: { label: 'Geral', icon: <Globe className="h-4 w-4" /> },
  contacts: { label: 'Contatos', icon: <MessageCircle className="h-4 w-4" /> },
  social: { label: 'Redes Sociais', icon: <MessageCircle className="h-4 w-4" /> },
  system: { label: 'Sistema', icon: <Settings className="h-4 w-4" /> },
  security: { label: 'Segurança', icon: <Shield className="h-4 w-4" /> },
  financial: { label: 'Financeiro', icon: <DollarSign className="h-4 w-4" /> },
  referral: { label: 'Indicações', icon: <Users className="h-4 w-4" /> },
};

const Predefinicoes = () => {
  const navigate = useNavigate();
  const [configs, setConfigs] = useState<SystemConfigItem[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await systemConfigAdminService.getAllConfigs();
      setConfigs(data);
      const initial: Record<string, string> = {};
      data.forEach((c) => {
        initial[c.config_key] = String(c.config_value);
      });
      setEditedValues(initial);
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar configurações');
      toast.error(err.message || 'Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handleSave = async (key: string, type: string) => {
    setSaving(key);
    try {
      await systemConfigAdminService.updateConfig(key, editedValues[key], type);
      toast.success(`"${key}" atualizada com sucesso!`);
      setConfigs((prev) =>
        prev.map((c) =>
          c.config_key === key ? { ...c, config_value: editedValues[key] } : c
        )
      );
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(null);
    }
  };

  const handleSaveAll = async () => {
    const changed = configs.filter(
      (c) => String(c.config_value) !== editedValues[c.config_key]
    );
    if (changed.length === 0) {
      toast.info('Nenhuma alteração para salvar');
      return;
    }
    setSaving('all');
    try {
      for (const c of changed) {
        await systemConfigAdminService.updateConfig(
          c.config_key,
          editedValues[c.config_key],
          c.config_type
        );
      }
      toast.success(`${changed.length} configuração(ões) atualizada(s)!`);
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(null);
    }
  };

  const groupedConfigs = configs.reduce<Record<string, SystemConfigItem[]>>((acc, config) => {
    const cat = config.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(config);
    return acc;
  }, {});

  const categories = Object.keys(groupedConfigs);

  const isChanged = (key: string) => {
    const original = configs.find((c) => c.config_key === key);
    return original && String(original.config_value) !== editedValues[key];
  };

  const renderConfigField = (config: SystemConfigItem) => {
    const value = editedValues[config.config_key] ?? '';
    const changed = isChanged(config.config_key);

    if (config.config_type === 'boolean') {
      return (
        <div
          key={config.config_key}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors"
        >
          <div className="flex-1 min-w-0">
            <Label className="text-sm font-semibold break-words">{config.description || config.config_key}</Label>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono truncate">{config.config_key}</p>
          </div>
          <div className="flex items-center gap-3 self-end sm:self-auto">
            <Switch
              checked={value === 'true' || value === '1'}
              onCheckedChange={(checked) => {
                const newVal = checked ? 'true' : 'false';
                setEditedValues((prev) => ({ ...prev, [config.config_key]: newVal }));
                // Auto-save booleans
                setSaving(config.config_key);
                systemConfigAdminService.updateConfig(config.config_key, newVal, config.config_type)
                  .then(() => {
                    toast.success(`"${config.config_key}" atualizada!`);
                    setConfigs((prev) =>
                      prev.map((c) => c.config_key === config.config_key ? { ...c, config_value: newVal } : c)
                    );
                  })
                  .catch(() => toast.error('Erro ao salvar'))
                  .finally(() => setSaving(null));
              }}
              disabled={saving === config.config_key}
            />
            {saving === config.config_key && <Loader2 className="h-3 w-3 animate-spin" />}
          </div>
        </div>
      );
    }

    return (
      <div
        key={config.config_key}
        className="p-3 sm:p-4 rounded-lg border border-border bg-card hover:bg-accent/5 transition-colors space-y-2"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <Label className="text-sm font-semibold break-words">{config.description || config.config_key}</Label>
            <p className="text-xs text-muted-foreground font-mono truncate">{config.config_key}</p>
          </div>
          {changed && (
            <Button
              size="sm"
              className="self-end sm:self-auto shrink-0"
              onClick={() => handleSave(config.config_key, config.config_type)}
              disabled={saving === config.config_key}
            >
              {saving === config.config_key ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <Save className="h-3 w-3 mr-1" />
              )}
              Salvar
            </Button>
          )}
        </div>
        <Input
          value={value}
          onChange={(e) =>
            setEditedValues((prev) => ({ ...prev, [config.config_key]: e.target.value }))
          }
          type={config.config_type === 'number' ? 'number' : 'text'}
          className={changed ? 'border-primary ring-1 ring-primary/20' : ''}
        />
      </div>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6 relative z-10 px-1 sm:px-0">
      {/* Header - mesmo padrão da Carteira */}
      <Card>
        <CardHeader className="p-3 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary flex-shrink-0" />
                <span className="truncate">Predefinições do Sistema</span>
                {error && (
                  <span className="text-[10px] sm:text-xs bg-red-100 text-red-700 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded dark:bg-red-900 dark:text-red-300 flex-shrink-0">
                    Erro
                  </span>
                )}
              </CardTitle>
              <p className="text-xs sm:text-sm text-muted-foreground mt-1 hidden sm:block">
                {error ? 'Erro ao carregar dados' : 'Gerencie as configurações globais da plataforma'}
              </p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <Badge variant="secondary" className={`text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 ${error ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"}`}>
                {error ? 'Erro' : `${configs.length} configs`}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={fetchConfigs}
                disabled={loading}
                className="h-7 w-7 sm:h-8 sm:w-8 p-0"
                title="Recarregar"
              >
                <RefreshCw className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
              <Button
                size="sm"
                onClick={handleSaveAll}
                disabled={saving === 'all' || loading}
                className="h-7 sm:h-8 px-2 sm:px-3 text-xs sm:text-sm"
                title="Salvar todas as alterações"
              >
                {saving === 'all' ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 sm:mr-1" />
                    <span className="hidden sm:inline">Salvar Tudo</span>
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate('/dashboard')}
                className="rounded-full h-9 w-9"
                aria-label="Voltar"
                title="Voltar"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Loading state */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-3 text-muted-foreground">Carregando configurações...</span>
          </CardContent>
        </Card>
      )}

      {/* Error state */}
      {!loading && error && (
        <Card>
          <CardContent className="text-center py-12 space-y-4">
            <p className="text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={fetchConfigs}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs por categoria */}
      {!loading && !error && categories.length > 0 && (
        <Tabs defaultValue={categories[0]} className="w-full">
          <Card className="mb-4">
            <CardContent className="p-2 sm:p-3">
              <TabsList className="flex flex-wrap h-auto gap-1 bg-transparent w-full justify-start">
                {categories.map((cat) => {
                  const info = CATEGORY_LABELS[cat] || { label: cat, icon: <Settings className="h-4 w-4" /> };
                  return (
                    <TabsTrigger key={cat} value={cat} className="flex items-center gap-1.5 text-xs sm:text-sm data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      {info.icon}
                      <span>{info.label}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1 h-4">
                        {groupedConfigs[cat]?.length || 0}
                      </Badge>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </CardContent>
          </Card>

          {categories.map((cat) => {
            const info = CATEGORY_LABELS[cat] || { label: cat, icon: <Settings className="h-4 w-4" /> };
            return (
              <TabsContent key={cat} value={cat} className="mt-0">
                <Card>
                  <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      {info.icon}
                      {info.label}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-3 sm:p-6 pt-0 space-y-2 sm:space-y-3">
                    {groupedConfigs[cat].map(renderConfigField)}
                  </CardContent>
                </Card>
              </TabsContent>
            );
          })}
        </Tabs>
      )}
    </div>
  );
};

export default Predefinicoes;
