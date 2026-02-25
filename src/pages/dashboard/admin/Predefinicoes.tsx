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
      toast.success(`"${key}" salva!`);
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

  const handleToggle = async (key: string, checked: boolean, type: string) => {
    const newVal = checked ? 'true' : 'false';
    setEditedValues((prev) => ({ ...prev, [key]: newVal }));
    setSaving(key);
    try {
      await systemConfigAdminService.updateConfig(key, newVal, type);
      toast.success(`"${key}" ${checked ? 'ativado' : 'desativado'}!`);
      setConfigs((prev) =>
        prev.map((c) => c.config_key === key ? { ...c, config_value: newVal } : c)
      );
    } catch {
      toast.error('Erro ao salvar');
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
        await systemConfigAdminService.updateConfig(c.config_key, editedValues[c.config_key], c.config_type);
      }
      toast.success(`${changed.length} configuração(ões) salva(s)!`);
      fetchConfigs();
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar');
    } finally {
      setSaving(null);
    }
  };

  const isChanged = (key: string) => {
    const original = configs.find((c) => c.config_key === key);
    return original && String(original.config_value) !== editedValues[key];
  };

  // Group configs: pair _enabled booleans with their parent field
  const groupedConfigs = configs.reduce<Record<string, SystemConfigItem[]>>((acc, config) => {
    const cat = config.category || 'general';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(config);
    return acc;
  }, {});

  // Find the matching _enabled toggle for a text config
  const findEnabledToggle = (key: string, categoryConfigs: SystemConfigItem[]): SystemConfigItem | undefined => {
    return categoryConfigs.find(c => c.config_key === `${key}_enabled` && c.config_type === 'boolean');
  };

  // Check if this config is an _enabled that's already paired with a parent
  const isLinkedEnabled = (key: string, categoryConfigs: SystemConfigItem[]): boolean => {
    if (!key.endsWith('_enabled')) return false;
    const parentKey = key.replace(/_enabled$/, '');
    return categoryConfigs.some(c => c.config_key === parentKey && c.config_type !== 'boolean');
  };

  const renderConfigField = (config: SystemConfigItem, categoryConfigs: SystemConfigItem[]) => {
    const value = editedValues[config.config_key] ?? '';
    const changed = isChanged(config.config_key);

    // Skip _enabled booleans that are paired with a text field
    if (isLinkedEnabled(config.config_key, categoryConfigs)) {
      return null;
    }

    // Standalone boolean (not paired)
    if (config.config_type === 'boolean') {
      return (
        <div
          key={config.config_key}
          className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0"
        >
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{config.description || config.config_key}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {saving === config.config_key && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
            <Switch
              checked={value === 'true' || value === '1'}
              onCheckedChange={(checked) => handleToggle(config.config_key, checked, config.config_type)}
              disabled={saving === config.config_key}
            />
          </div>
        </div>
      );
    }

    // Text/number field — check for paired _enabled toggle
    const enabledToggle = findEnabledToggle(config.config_key, categoryConfigs);
    const toggleValue = enabledToggle ? (editedValues[enabledToggle.config_key] ?? '') : null;
    const isEnabled = toggleValue === 'true' || toggleValue === '1';

    return (
      <div key={config.config_key} className="py-3 border-b border-border last:border-0 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium truncate">{config.description || config.config_key}</p>
          {changed && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-primary shrink-0"
              onClick={() => handleSave(config.config_key, config.config_type)}
              disabled={saving === config.config_key}
            >
              {saving === config.config_key ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <><Save className="h-3 w-3 mr-1" /> Salvar</>
              )}
            </Button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Input
            value={value}
            onChange={(e) =>
              setEditedValues((prev) => ({ ...prev, [config.config_key]: e.target.value }))
            }
            type={config.config_type === 'number' ? 'number' : 'text'}
            className={`flex-1 h-9 text-sm ${changed ? 'border-primary ring-1 ring-primary/20' : ''}`}
          />
          {enabledToggle && (
            <div className="flex items-center gap-1.5 shrink-0">
              {saving === enabledToggle.config_key && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              <Switch
                checked={isEnabled}
                onCheckedChange={(checked) => handleToggle(enabledToggle.config_key, checked, enabledToggle.config_type)}
                disabled={saving === enabledToggle.config_key}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  const categories = Object.keys(groupedConfigs);

  return (
    <div className="space-y-4 relative z-10 px-1 sm:px-0 max-w-3xl mx-auto">
      {/* Header */}
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

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <Card>
          <CardContent className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchConfigs}>
              <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      {!loading && !error && categories.length > 0 && (
        <Tabs defaultValue={categories[0]} className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1 rounded-lg w-full justify-start">
            {categories.map((cat) => {
              const info = CATEGORY_LABELS[cat] || { label: cat, icon: <Settings className="h-4 w-4" /> };
              return (
                <TabsTrigger
                  key={cat}
                  value={cat}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                >
                  {info.icon}
                  <span>{info.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map((cat) => {
            const info = CATEGORY_LABELS[cat] || { label: cat, icon: <Settings className="h-4 w-4" /> };
            const catConfigs = groupedConfigs[cat];
            return (
              <TabsContent key={cat} value={cat} className="mt-3">
                <Card>
                  <CardHeader className="px-4 py-3 border-b border-border">
                    <CardTitle className="text-sm flex items-center gap-2">
                      {info.icon}
                      {info.label}
                      <Badge variant="secondary" className="text-[10px] ml-auto">{catConfigs.length}</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 py-1">
                    {catConfigs.map((c) => renderConfigField(c, catConfigs))}
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
