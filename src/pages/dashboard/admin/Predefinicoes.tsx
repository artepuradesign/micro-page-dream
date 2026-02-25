import React, { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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

  const hasAnyChange = configs.some((c) => String(c.config_value) !== editedValues[c.config_key]);

  // Find the matching boolean toggle for a text field (e.g. contact_telegram_username -> contact_telegram_enabled)
  const findRelatedToggle = (key: string, allConfigs: SystemConfigItem[]): SystemConfigItem | undefined => {
    // Extract base name: contact_telegram_username -> contact_telegram
    const parts = key.split('_');
    // Try removing last segment and appending _enabled
    const baseName = parts.slice(0, -1).join('_');
    return allConfigs.find(
      (c) => c.config_type === 'boolean' && c.config_key === `${baseName}_enabled`
    );
  };

  const renderToggleInline = (toggleConfig: SystemConfigItem) => {
    const toggleValue = editedValues[toggleConfig.config_key] ?? '';
    const isEnabled = toggleValue === 'true' || toggleValue === '1';
    return (
      <div className="flex items-center gap-1.5 flex-shrink-0" title={isEnabled ? 'Ativado' : 'Desativado'}>
        {saving === toggleConfig.config_key && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => {
            const newVal = checked ? 'true' : 'false';
            setEditedValues((prev) => ({ ...prev, [toggleConfig.config_key]: newVal }));
            setSaving(toggleConfig.config_key);
            systemConfigAdminService.updateConfig(toggleConfig.config_key, newVal, toggleConfig.config_type)
              .then(() => {
                toast.success(`"${toggleConfig.config_key}" atualizada!`);
                setConfigs((prev) =>
                  prev.map((c) => c.config_key === toggleConfig.config_key ? { ...c, config_value: newVal } : c)
                );
              })
              .catch(() => toast.error('Erro ao salvar'))
              .finally(() => setSaving(null));
          }}
          disabled={saving === toggleConfig.config_key}
          className="scale-90"
        />
      </div>
    );
  };

  // Render grouped configs: text fields get their boolean toggle inline
  const renderCategoryConfigs = (categoryConfigs: SystemConfigItem[]) => {
    // Collect keys of booleans that are paired with a text field so we skip rendering them standalone
    const pairedBooleanKeys = new Set<string>();
    categoryConfigs.forEach((c) => {
      if (c.config_type !== 'boolean') {
        const toggle = findRelatedToggle(c.config_key, categoryConfigs);
        if (toggle) pairedBooleanKeys.add(toggle.config_key);
      }
    });

    return categoryConfigs
      .filter((c) => !pairedBooleanKeys.has(c.config_key)) // skip paired booleans
      .map((config) => {
        const value = editedValues[config.config_key] ?? '';
        const changed = isChanged(config.config_key);

        // Standalone boolean (no paired text field)
        if (config.config_type === 'boolean') {
          return (
            <div
              key={config.config_key}
              className="flex items-center justify-between gap-3 py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight">{config.description || config.config_key}</p>
              </div>
              {renderToggleInline(config)}
            </div>
          );
        }

        // Text/number field — check for paired toggle
        const relatedToggle = findRelatedToggle(config.config_key, categoryConfigs);

        return (
          <div
            key={config.config_key}
            className="py-2.5 px-3 rounded-lg hover:bg-accent/50 transition-colors space-y-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium leading-tight flex-1 min-w-0">{config.description || config.config_key}</p>
              {changed && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs text-primary hover:text-primary flex-shrink-0"
                  onClick={() => handleSave(config.config_key, config.config_type)}
                  disabled={saving === config.config_key}
                >
                  {saving === config.config_key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3 mr-1" />
                  )}
                  Salvar
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
                className={`h-8 text-sm flex-1 ${changed ? 'border-primary ring-1 ring-primary/20' : ''}`}
              />
              {relatedToggle && renderToggleInline(relatedToggle)}
            </div>
          </div>
        );
      });
  };

  return (
    <div className="space-y-4 relative z-10 px-1 sm:px-0 pb-20">
      {/* Header compacto */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/dashboard')}
            className="rounded-full h-8 w-8 flex-shrink-0"
            aria-label="Voltar"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold">Predefinições</h1>
            <p className="text-xs text-muted-foreground">Gerencie as configurações</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!loading && !error && (
            <Badge variant="secondary" className="text-[10px] px-2 py-0.5">
              {configs.length} configs
            </Badge>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={fetchConfigs}
            disabled={loading}
            className="h-8 w-8"
            title="Recarregar"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="ml-3 text-sm text-muted-foreground">Carregando...</span>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {!loading && error && (
        <Card>
          <CardContent className="text-center py-12 space-y-3">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchConfigs}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      {!loading && !error && categories.length > 0 && (
        <Tabs defaultValue={categories[0]} className="w-full">
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <TabsList className="inline-flex h-9 gap-0.5 bg-muted/50 p-0.5">
              {categories.map((cat) => {
                const info = CATEGORY_LABELS[cat] || { label: cat, icon: <Settings className="h-3.5 w-3.5" /> };
                return (
                  <TabsTrigger
                    key={cat}
                    value={cat}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-md"
                  >
                    {info.icon}
                    <span className="hidden sm:inline">{info.label}</span>
                    <span className="sm:hidden">{info.label.slice(0, 3)}</span>
                    <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 ml-0.5">
                      {groupedConfigs[cat]?.length || 0}
                    </Badge>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          {categories.map((cat) => (
            <TabsContent key={cat} value={cat} className="mt-3">
              <Card>
                <CardContent className="p-2 sm:p-3 divide-y divide-border/50">
                  {renderCategoryConfigs(groupedConfigs[cat])}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Botão flutuante Salvar Tudo */}
      {hasAnyChange && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            onClick={handleSaveAll}
            disabled={saving === 'all'}
            className="h-12 px-5 rounded-full shadow-lg hover:shadow-xl transition-all gap-2"
            size="lg"
          >
            {saving === 'all' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            Salvar Tudo
          </Button>
        </div>
      )}
    </div>
  );
};

export default Predefinicoes;
