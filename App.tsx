import React, { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Package, LogOut, Factory, AlertCircle, BrainCircuit, Loader2, 
  ArrowRight, Layers, Globe, History, LayoutDashboard, Calculator,
  Settings, Save, Plus, Trash2, CheckCircle, Truck, ArrowUpRight, X, 
  ShoppingCart, Download, ClipboardCheck, FileUp, Edit2
} from 'lucide-react';
import { 
  ViewType, Product, RawMaterial, Recipe, ProductionOrder, Movement, UserProfile 
} from './types';
import { TABS, INITIAL_CATALOG } from './constants';
import { Card, Button, Input, Badge, SectionHeader } from './components/UI';
import { getAIInventoryAdvice } from './services/geminiService';

// CREDENCIALES FIJAS
const SUPABASE_URL = "https://ackljuztzpklddssbovs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFja2xqdXp0enBrbGRkc3Nib3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODQ3OTUsImV4cCI6MjA4NDM2MDc5NX0.Rf7HFaLikmKelpikr_3CiQsfzjS5sHp3T-HTv75XXyE";

const K = {
  PRODUCTS: 'mb_prods_v3',
  MPS: 'mb_mps_v3',
  RECIPES: 'mb_recipes_v3',
  ORDERS: 'mb_orders_v3',
  HISTORY: 'mb_history_v3',
  USER: 'mb_user_v3'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<ViewType>(ViewType.DASHBOARD);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [tempName, setTempName] = useState('');
  const [supabase] = useState(() => createClient(SUPABASE_URL, SUPABASE_KEY));
  const [isOnline, setIsOnline] = useState(false);
  
  const [products, setProducts] = useState<Product[]>([]);
  const [mps, setMps] = useState<RawMaterial[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [history, setHistory] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiAdvice, setAiAdvice] = useState<string[]>([]);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);

  // Verificar conexión
  useEffect(() => {
    const checkConn = async () => {
      const { error } = await supabase.from('products').select('count', { count: 'exact', head: true });
      setIsOnline(!error);
    };
    checkConn();
  }, [supabase]);

  const loadData = useCallback(async () => {
    setLoading(true);
    let cloudLoaded = false;

    if (isOnline) {
      try {
        const [pRes, mRes, rRes, oRes, hRes] = await Promise.all([
          supabase.from('products').select('*').order('sku'),
          supabase.from('mps').select('*').order('sku'),
          supabase.from('recipes').select('*'),
          supabase.from('orders').select('*').eq('status', 'in_progress'),
          supabase.from('history').select('*').order('ts', { ascending: false }).limit(50)
        ]);

        if (pRes.data && pRes.data.length > 0) {
          setProducts(pRes.data);
          setMps(mRes.data || []);
          setRecipes(rRes.data || []);
          setOrders(oRes.data || []);
          setHistory(hRes.data || []);
          cloudLoaded = true;
        }
      } catch (e) { console.error("Cloud load error:", e); }
    }

    if (!cloudLoaded) {
      const storedProds = localStorage.getItem(K.PRODUCTS);
      setProducts(storedProds ? JSON.parse(storedProds) : INITIAL_CATALOG.map((p, i) => ({ ...p, id: `p-${i}`, wip: 0 })));
      setMps(JSON.parse(localStorage.getItem(K.MPS) || '[]'));
      setRecipes(JSON.parse(localStorage.getItem(K.RECIPES) || '[]'));
      setHistory(JSON.parse(localStorage.getItem(K.HISTORY) || '[]'));
      setOrders(JSON.parse(localStorage.getItem(K.ORDERS) || '[]'));
    }

    const storedUser = localStorage.getItem(K.USER);
    if (storedUser) setUser(JSON.parse(storedUser));
    setLoading(false);
  }, [supabase, isOnline]);

  useEffect(() => { loadData(); }, [loadData]);

  // Persistencia local
  useEffect(() => {
    if (loading) return;
    localStorage.setItem(K.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(K.MPS, JSON.stringify(mps));
    localStorage.setItem(K.RECIPES, JSON.stringify(recipes));
    localStorage.setItem(K.ORDERS, JSON.stringify(orders));
    localStorage.setItem(K.HISTORY, JSON.stringify(history));
  }, [products, mps, recipes, orders, history, loading]);

  const logMovement = useCallback(async (tipo: string, detalle: string) => {
    const newMov = { id: Math.random().toString(36).substr(2, 9), ts: new Date().toISOString(), tipo, detalle, user: user?.name || 'Sistema' };
    setHistory(prev => [newMov, ...prev].slice(0, 50));
    if (isOnline) await supabase.from('history').insert([newMov]);
  }, [user, isOnline, supabase]);

  const updateProductField = async (id: string, field: keyof Product, value: any) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    if (isOnline) await supabase.from('products').update({ [field]: value }).eq('id', id);
  };

  const updateMpField = async (id: string, field: keyof RawMaterial, value: any) => {
    setMps(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    if (isOnline) await supabase.from('mps').update({ [field]: value }).eq('id', id);
  };

  const deleteProduct = async (id: string) => {
    const prodToDelete = products.find(p => p.id === id);
    if (!prodToDelete) return;
    
    if (confirm(`¿Está seguro de eliminar permanentemente el SKU: ${prodToDelete.sku}?`)) {
      setProducts(prev => prev.filter(p => p.id !== id));
      logMovement('ELIMINAR_SKU', `Se eliminó el producto ${prodToDelete.sku}`);
      if (isOnline) {
        await supabase.from('products').delete().eq('id', id);
      }
    }
  };

  const handleAddProduct = async (data: Partial<Product>) => {
    const newProd: Product = {
      id: Math.random().toString(36).substr(2, 9),
      sku: data.sku || 'NUEVO-SKU',
      marca: data.marca || '-',
      modelo: data.modelo || '-',
      lado: data.lado || '-',
      min: data.min || 5,
      stock: data.stock || 0,
      wip: 0
    };
    setProducts(prev => [newProd, ...prev]);
    logMovement('NUEVO_SKU', `Se creó manualmente el SKU ${newProd.sku}`);
    if (isOnline) await supabase.from('products').insert([newProd]);
    setShowAddProduct(false);
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/);
      const newItems: Product[] = [];

      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Soporta comas o puntos y comas (común en Excel español)
        const separator = trimmed.includes(';') ? ';' : ',';
        const cols = trimmed.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        
        // Salto de cabecera si detecta palabras clave
        if (i === 0 && (cols[0].toLowerCase().includes('sku') || cols[1]?.toLowerCase().includes('marca'))) return;
        
        if (cols.length >= 2) {
          newItems.push({
            id: Math.random().toString(36).substr(2, 9),
            sku: cols[0] || 'CSV-SKU',
            marca: cols[1] || '-',
            modelo: cols[2] || '-',
            lado: cols[3] || '-',
            min: parseInt(cols[4]) || 5,
            stock: parseInt(cols[5]) || 0,
            wip: 0
          });
        }
      });

      if (newItems.length > 0) {
        setProducts(prev => [...newItems, ...prev]);
        logMovement('CARGA_MASIVA', `Se importaron ${newItems.length} registros desde CSV`);
        if (isOnline) await supabase.from('products').insert(newItems);
        alert(`Éxito: Se importaron ${newItems.length} registros.`);
      }
    };
    reader.readAsText(file);
    event.target.value = ""; 
  };

  const handleDispatch = async (id: string, qty: number) => {
    const prod = products.find(p => p.id === id);
    if (!prod) return;
    if (prod.stock < qty) {
      alert(`⚠️ ERROR: Stock insuficiente.`);
      return;
    }
    const newStock = prod.stock - qty;
    await updateProductField(id, 'stock', newStock);
    logMovement('DESPACHO', `Se despacharon ${qty}u de ${prod.sku}`);
  };

  const handleMpEntry = async (id: string, qty: number) => {
    const mp = mps.find(m => m.id === id);
    if (!mp) return;
    const newStock = mp.stock + qty;
    await updateMpField(id, 'stock', newStock);
    logMovement('INGRESO_MP', `Ingreso de material: +${qty}u de ${mp.desc}`);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (tempName.trim()) {
      const newUser: UserProfile = { name: tempName, role: 'admin' };
      setUser(newUser);
      localStorage.setItem(K.USER, JSON.stringify(newUser));
      logMovement('LOGIN', `Ingreso de operario: ${tempName}`);
    }
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-2xl bg-white rounded-[2.5rem]">
          <div className="text-center mb-10">
            <div className="bg-[#2B3860] w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl text-white">
              <Package size={40} />
            </div>
            <h1 className="text-3xl font-black text-[#2B3860]">Merlobus Pro</h1>
          </div>
          <form onSubmit={handleLogin} className="space-y-6">
            <Input autoFocus placeholder="Nombre de Operario" value={tempName} onChange={e => setTempName(e.target.value)} />
            <Button type="submit" className="w-full py-4" icon={ArrowRight}>Entrar</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <div className="bg-[#2B3860] p-2 rounded-xl text-white"><Package size={24} /></div>
          <span className="font-black text-xl text-[#2B3860] tracking-tight">MERLOBUS</span>
        </div>
        <div className="flex items-center gap-4">
          <Badge type={isOnline ? 'ok' : 'warn'} text={isOnline ? 'CONECTADO' : 'MODO LOCAL'} />
          <button onClick={() => {setUser(null); localStorage.removeItem(K.USER)}} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-20 lg:w-64 bg-white border-r p-4 flex flex-col gap-2 shadow-sm overflow-y-auto">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id as ViewType)} className={`flex items-center gap-3 p-4 rounded-xl transition-all ${isActive ? 'bg-[#2B3860] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
                <tab.icon size={20} />
                <span className="hidden lg:block font-bold text-sm">{tab.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          {activeTab === ViewType.DASHBOARD && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <SectionHeader title="Panel de Gestión" subtitle={`Hola, ${user.name}`} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard title="Stock Total" value={products.reduce((a, b) => a + b.stock, 0)} icon={Package} color="blue" />
                <StatCard title="En Proceso" value={products.reduce((a, b) => a + (b.wip || 0), 0)} icon={Factory} color="blue" />
                <StatCard title="Críticos" value={products.filter(p => p.stock < p.min).length} icon={AlertCircle} color="red" />
              </div>
              <div className="mt-8">
                 <Button onClick={() => { setIsAiLoading(true); getAIInventoryAdvice(products, mps).then(setAiAdvice).finally(()=>setIsAiLoading(false)) }} disabled={isAiLoading} variant="special" icon={BrainCircuit} className="h-12 px-6">
                  {isAiLoading ? 'Analizando...' : 'Consejo de Asistente IA'}
                </Button>
                {aiAdvice.length > 0 && (
                  <Card className="p-6 bg-indigo-50 border-indigo-200 mt-4 animate-in slide-in-from-left-4">
                    <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2"><BrainCircuit size={18} /> Sugerencias de Producción</h3>
                    <ul className="space-y-2">
                      {aiAdvice.map((a, i) => <li key={i} className="text-sm text-indigo-700 bg-white/50 p-3 rounded-lg border border-indigo-100 font-medium">• {a}</li>)}
                    </ul>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === ViewType.PRODUCTS && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <SectionHeader title="Control de Espejos" subtitle="Listado de stock y edición de SKUs" />
                <div className="flex gap-2">
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all font-medium text-xs shadow-sm">
                    <FileUp size={16} /> Carga CSV
                    <input type="file" accept=".csv" className="hidden" onChange={handleCsvUpload} />
                  </label>
                  <Button onClick={() => setShowAddProduct(true)} icon={Plus} size="sm">Añadir SKU</Button>
                </div>
              </div>

              {showAddProduct && (
                <Card className="p-6 bg-blue-50 border-blue-200 animate-in slide-in-from-top-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-blue-900 uppercase text-xs tracking-widest">Nuevo Producto</h3>
                    <button onClick={() => setShowAddProduct(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
                  </div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    handleAddProduct({
                      sku: fd.get('sku') as string,
                      marca: fd.get('marca') as string,
                      modelo: fd.get('modelo') as string,
                      lado: fd.get('lado') as string,
                      min: Number(fd.get('min')),
                      stock: Number(fd.get('stock'))
                    });
                  }} className="grid grid-cols-2 md:grid-cols-6 gap-3">
                    <Input name="sku" placeholder="SKU" required />
                    <Input name="marca" placeholder="Marca" required />
                    <Input name="modelo" placeholder="Modelo" />
                    <Input name="lado" placeholder="Lado" />
                    <Input name="min" type="number" placeholder="Min" defaultValue="5" />
                    <Button type="submit">Guardar</Button>
                  </form>
                </Card>
              )}
              
              <InventoryTable 
                data={products} 
                type="products" 
                onUpdateField={updateProductField}
                onDelete={deleteProduct}
                onAction={handleDispatch} 
              />
            </div>
          )}

          {activeTab === ViewType.RAW_MATERIALS && (
            <div className="space-y-8 animate-in fade-in duration-300">
              <SectionHeader title="Materias Primas" subtitle="Insumos para el proceso de fabricación" />
              <InventoryTable 
                data={mps} 
                type="mps" 
                onUpdateField={updateMpField}
                onAction={handleMpEntry} 
              />
            </div>
          )}

          {activeTab === ViewType.OPERATIONS && (
             <OperationsManager 
               products={products} 
               orders={orders} 
               onCompleteOrder={async (order) => {
                 const prod = products.find(p => p.id === order.prodId);
                 if (prod) {
                   const newStock = (prod.stock || 0) + order.qty;
                   const newWip = Math.max(0, (prod.wip || 0) - order.qty);
                   setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, stock: newStock, wip: newWip } : p));
                   setOrders(prev => prev.filter(o => o.id !== order.id));
                   logMovement('PRODUCCION', `Se completaron ${order.qty}u de ${prod.sku}`);
                   if (isOnline) {
                     await supabase.from('products').update({ stock: newStock, wip: newWip }).eq('id', prod.id);
                     await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id);
                   }
                 }
               }}
               onStartOrder={async (prodId, qty) => {
                 const prod = products.find(p => p.id === prodId);
                 if (!prod) return;
                 const newOrder: ProductionOrder = { id: Math.random().toString(36).substr(2, 9), prodId, productName: prod.sku, qty, status: 'in_progress', startedAt: new Date().toISOString(), startedBy: user.name };
                 setOrders(prev => [newOrder, ...prev]);
                 const newWip = (prod.wip || 0) + qty;
                 setProducts(prev => prev.map(p => p.id === prodId ? { ...p, wip: newWip } : p));
                 logMovement('PRODUCCION', `Inició fabricación de ${qty}u de ${prod.sku}`);
                 if (isOnline) {
                   await supabase.from('orders').insert([newOrder]);
                   await supabase.from('products').update({ wip: newWip }).eq('id', prodId);
                 }
               }}
             />
          )}

          {activeTab === ViewType.PLANNING && <PlanningView products={products} mps={mps} recipes={recipes} />}
          
          {activeTab === ViewType.RECIPES && <RecipeManager products={products} mps={mps} recipes={recipes} />}

          {activeTab === ViewType.REPORTS && (
            <div className="max-w-2xl mx-auto py-10 animate-in zoom-in-95 duration-300">
              <SectionHeader title="Sincronización y Respaldo" />
              <Card className="p-10 text-center space-y-6 bg-white shadow-xl">
                <Globe size={64} className={`mx-auto ${isOnline ? 'text-emerald-500' : 'text-slate-300'}`} />
                <div>
                  <h3 className="text-2xl font-black text-slate-800">{isOnline ? 'Nube Sincronizada' : 'Modo Offline'}</h3>
                  <p className="text-slate-500 mt-2">Gestiona tus datos de forma segura con Supabase.</p>
                </div>
                <div className="flex flex-col md:flex-row gap-4">
                  <Button onClick={() => window.location.reload()} className="flex-1">Refrescar Sistema</Button>
                  <Button variant="secondary" onClick={() => {
                    const data = { products, mps, recipes, history };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `backup_merlobus_${new Date().toISOString().split('T')[0]}.json`;
                    a.click();
                  }} className="flex-1" icon={Download}>Descargar Respaldo</Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === ViewType.HISTORY && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <SectionHeader title="Historial Auditor" subtitle="Trazabilidad de todos los cambios en el inventario" />
              <Card className="overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-800 text-white text-[10px] uppercase font-black">
                    <tr><th className="p-4">Timestamp</th><th className="p-4">Evento</th><th className="p-4">Detalle</th><th className="p-4 text-right">Responsable</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map(h => (
                      <tr key={h.id} className="text-xs hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-400 font-mono">{new Date(h.ts).toLocaleString()}</td>
                        <td className="p-4"><span className="font-bold text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded tracking-tighter">{h.tipo}</span></td>
                        <td className="p-4 italic text-slate-600">{h.detalle}</td>
                        <td className="p-4 text-right font-black uppercase text-slate-400">{h.user}</td>
                      </tr>
                    ))}
                    {history.length === 0 && <tr><td colSpan={4} className="p-10 text-center italic text-slate-300">No hay registros aún</td></tr>}
                  </tbody>
                </table>
              </Card>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color }: any) => {
  const colors: any = { blue: "bg-blue-50 text-blue-600", red: "bg-red-50 text-red-600" };
  return (
    <Card className="p-6 flex items-center gap-5 transition-transform hover:scale-[1.02]">
      <div className={`p-4 rounded-2xl ${colors[color]}`}><Icon size={28} /></div>
      <div>
        <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</p>
        <p className="text-3xl font-black text-[#2B3860]">{value}</p>
      </div>
    </Card>
  );
};

const InventoryTable = ({ data, type, onUpdateField, onDelete, onAction }: any) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  const [actionQty, setActionQty] = useState<number>(1);

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
            <tr>
              <th className="p-4 w-12 text-center">#</th>
              <th className="p-4">SKU / Identificador</th>
              {type === 'products' && (
                <>
                  <th className="p-4">Marca</th>
                  <th className="p-4">Modelo / Detalle</th>
                </>
              )}
              <th className="p-4 text-center">Stock Mín.</th>
              <th className="p-4 text-center">Stock Act.</th>
              {type === 'products' && <th className="p-4 text-center">Proceso</th>}
              <th className="p-4 text-center">Estado</th>
              <th className="p-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item: any, idx: number) => {
              const isCritical = item.stock < item.min;
              const isEditing = editingId === item.id;
              
              return (
                <tr key={item.id} className={`hover:bg-slate-50 transition-all text-sm group ${isEditing ? 'bg-blue-50/50' : ''}`}>
                  <td className="p-4 text-center font-bold text-slate-300">{idx + 1}</td>
                  
                  <td className="p-4 font-mono font-bold text-slate-600">
                    {isEditing ? (
                      <Input value={item.sku} onChange={e => onUpdateField(item.id, 'sku', e.target.value)} className="w-40 h-8" />
                    ) : (item.sku || item.desc)}
                  </td>

                  {type === 'products' && (
                    <>
                      <td className="p-4">
                        {isEditing ? (
                          <Input value={item.marca} onChange={e => onUpdateField(item.id, 'marca', e.target.value)} className="w-24 h-8" />
                        ) : (
                          <span className="text-slate-500 font-medium">{item.marca}</span>
                        )}
                      </td>
                      <td className="p-4">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <Input value={item.modelo} onChange={e => onUpdateField(item.id, 'modelo', e.target.value)} className="w-20 h-8" placeholder="Mod" />
                            <Input value={item.lado} onChange={e => onUpdateField(item.id, 'lado', e.target.value)} className="w-14 h-8" placeholder="Lado" />
                          </div>
                        ) : (
                          <span className="text-slate-500 font-medium">{item.modelo} {item.lado}</span>
                        )}
                      </td>
                    </>
                  )}

                  <td className="p-4 text-center">
                    <input 
                      type="number" 
                      className="w-16 text-center p-1 border rounded-lg bg-transparent hover:bg-white focus:bg-white transition-all outline-none" 
                      value={item.min} 
                      onChange={e => onUpdateField(item.id, 'min', parseInt(e.target.value) || 0)} 
                    />
                  </td>

                  <td className="p-4 text-center">
                    <input 
                      type="number" 
                      className={`w-16 text-center p-1 border rounded-lg font-black bg-transparent hover:bg-white focus:bg-white outline-none transition-all ${isCritical ? 'text-red-600' : 'text-emerald-600'}`} 
                      value={item.stock} 
                      onChange={e => onUpdateField(item.id, 'stock', parseInt(e.target.value) || 0)} 
                    />
                  </td>

                  {type === 'products' && (
                    <td className="p-4 text-center font-bold text-amber-500">
                      {item.wip || 0}
                    </td>
                  )}

                  <td className="p-4 text-center">
                    {isCritical ? <Badge type="danger" text="FALTA" /> : <Badge type="ok" text="OK" />}
                  </td>

                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center gap-1">
                      {activeActionId === item.id ? (
                        <div className="flex items-center gap-1 animate-in slide-in-from-right-2">
                          <Input type="number" className="w-14 h-7 p-1 text-center" value={actionQty} onChange={e=>setActionQty(Number(e.target.value))} />
                          <button onClick={() => {onAction(item.id, actionQty); setActiveActionId(null); setActionQty(1)}} className="bg-emerald-600 text-white p-1 rounded hover:shadow-md transition-shadow"><CheckCircle size={14}/></button>
                          <button onClick={() => setActiveActionId(null)} className="text-slate-400 hover:text-slate-600"><X size={14}/></button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => setActiveActionId(item.id)} 
                            title={type === 'products' ? "Despacho Rápido" : "Ingreso Rápido"}
                            className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                          >
                            <Truck size={16}/>
                          </button>
                          <button 
                            onClick={() => setEditingId(isEditing ? null : item.id)} 
                            title="Editar Datos"
                            className={`p-1.5 rounded-lg transition-colors ${isEditing ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}
                          >
                            {isEditing ? <CheckCircle size={16}/> : <Edit2 size={16}/>}
                          </button>
                          {type === 'products' && (
                            <button 
                              onClick={() => onDelete(item.id)} 
                              title="Borrar SKU"
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 size={16}/>
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {data.length === 0 && (
              <tr><td colSpan={10} className="p-20 text-center italic text-slate-300">No hay datos disponibles</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const PlanningView = ({ products, mps, recipes }: any) => {
  const [sel, setSel] = useState('');
  const [qty, setQty] = useState(1);
  const requirements = recipes
    .filter((r:any) => r.prodId === sel)
    .map((r:any) => ({ mp: mps.find((m:any) => m.id === r.mpId), needed: r.qty * qty }));

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <SectionHeader title="Simulación de Materiales" subtitle="Planifica cuántos insumos necesitas para un lote" />
      <Card className="p-8 bg-[#2B3860] text-white flex flex-col md:flex-row gap-8 items-end shadow-xl">
        <div className="flex-1 w-full">
          <label className="text-[10px] font-black uppercase text-blue-200 mb-2 block tracking-widest">Modelo / SKU</label>
          <select className="w-full p-4 rounded-xl text-slate-900 font-bold bg-white focus:ring-4 focus:ring-blue-400 outline-none" value={sel} onChange={e=>setSel(e.target.value)}>
            <option value="">-- Seleccionar --</option>
            {products.map((p:any)=><option key={p.id} value={p.id}>{p.sku} ({p.marca})</option>)}
          </select>
        </div>
        <div className="w-full md:w-32">
          <label className="text-[10px] font-black uppercase text-blue-200 mb-2 block tracking-widest">Lote a Fabricar</label>
          <Input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} className="p-4 font-black text-center text-slate-900 h-[56px] text-lg" />
        </div>
      </Card>
      {sel ? (
        <Card className="p-8 shadow-lg bg-white">
          <h3 className="font-black text-xl mb-6 text-slate-800 border-b pb-4">Necesidades de Insumos</h3>
          <table className="w-full">
            <thead className="text-[10px] uppercase font-black text-slate-400">
              <tr className="border-b"><th className="pb-4 text-left">Componente</th><th className="pb-4 text-center">Disponible</th><th className="pb-4 text-center">Necesario</th><th className="pb-4 text-right">Resultado</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requirements.map((req:any, i:number) => {
                const diff = (req.mp?.stock || 0) - req.needed;
                return (
                  <tr key={i} className="text-sm group hover:bg-slate-50 transition-colors">
                    <td className="py-4 font-bold text-slate-700">{req.mp?.desc || 'Material s/n'}</td>
                    <td className="py-4 text-center font-medium">{req.mp?.stock || 0}</td>
                    <td className="py-4 text-center font-black text-blue-600">{req.needed}</td>
                    <td className="py-4 text-right">
                      {diff >= 0 ? <Badge type="ok" text="LISTO" /> : <Badge type="danger" text={`FALTA ${Math.abs(diff)}`} />}
                    </td>
                  </tr>
                );
              })}
              {requirements.length === 0 && <tr><td colSpan={4} className="py-10 text-center italic text-slate-300">No hay receta para este producto</td></tr>}
            </tbody>
          </table>
        </Card>
      ) : (
        <div className="text-center py-20 bg-slate-100/50 border-2 border-dashed border-slate-200 rounded-3xl">
          <Calculator size={48} className="mx-auto text-slate-300 mb-4" />
          <p className="text-slate-400 font-medium">Elige un SKU para proyectar la fabricación</p>
        </div>
      )}
    </div>
  );
};

const RecipeManager = ({ products, mps, recipes }: any) => {
  const [sel, setSel] = useState('');
  const productRecipes = recipes.filter((r:any) => r.prodId === sel);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in duration-500">
      <Card className="p-6 h-fit bg-white border-slate-200 shadow-lg">
        <h3 className="font-bold mb-4 text-slate-800">Recetas / BOM</h3>
        <select className="w-full p-3 border rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 outline-none" value={sel} onChange={e=>setSel(e.target.value)}>
          <option value="">-- Seleccionar --</option>
          {products.map((p:any)=><option key={p.id} value={p.id}>{p.sku}</option>)}
        </select>
        {sel && (
          <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mb-2">Composición</p>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Insumos:</span>
              <Badge type="info" text={productRecipes.length.toString()} />
            </div>
          </div>
        )}
      </Card>
      
      <Card className="md:col-span-2 p-8 min-h-[500px] shadow-xl bg-white">
        <div className="flex items-center justify-between mb-8">
          <h3 className="font-black text-xl flex items-center gap-2 text-slate-800"><Save className="text-blue-600" /> Detalle de Componentes</h3>
          <Button variant="secondary" size="sm" icon={Plus} disabled={!sel}>Añadir Material</Button>
        </div>
        
        {sel ? (
          <div className="space-y-4">
            {productRecipes.map((r:any) => (
              <div key={r.id} className="p-5 bg-white rounded-xl flex justify-between items-center border border-slate-100 shadow-sm hover:border-blue-200 transition-all group">
                <div>
                  <span className="font-bold text-slate-700 block">{mps.find((m:any)=>m.id === r.mpId)?.desc || 'Material'}</span>
                  <span className="text-[10px] text-slate-400 font-mono tracking-tighter">SKU_REF: {r.mpId}</span>
                </div>
                <div className="flex items-center gap-6">
                  <span className="font-black text-blue-700 text-lg">{r.qty} <span className="text-xs font-normal text-slate-400">u.</span></span>
                  <button className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
            {productRecipes.length === 0 && (
              <div className="text-center py-24 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                <Layers className="mx-auto text-slate-300 mb-4" size={48} />
                <p className="text-slate-400 font-medium italic">Sin materiales asignados aún.</p>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 italic py-20">
            <Package size={64} className="mb-4 opacity-10" />
            <p className="text-lg">Elige un espejo para ver su hoja de ruta</p>
          </div>
        )}
      </Card>
    </div>
  );
};

const OperationsManager = ({ products, orders, onCompleteOrder, onStartOrder }: any) => {
  const [sel, setSel] = useState('');
  const [qty, setQty] = useState(1);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in zoom-in-95 duration-500">
      <Card className="p-8 space-y-6 shadow-xl border-t-4 border-t-blue-600 bg-white">
        <h3 className="font-black text-2xl flex items-center gap-3 text-slate-800"><Factory className="text-blue-600" /> Lanzar Producción</h3>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-2 block tracking-widest">Producto / Modelo</label>
            <select className="w-full p-4 border rounded-xl text-lg font-bold bg-slate-50 focus:ring-4 focus:ring-blue-100 outline-none" value={sel} onChange={e=>setSel(e.target.value)}>
              <option value="">-- Elegir --</option>
              {products.map((p:any) => <option key={p.id} value={p.id}>{p.sku} (Libre: {p.stock}u)</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-black text-slate-400 uppercase mb-2 block tracking-widest">Cantidad</label>
            <Input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} className="p-4 text-2xl font-black text-center h-[64px]" />
          </div>
        </div>
        <Button onClick={() => {onStartOrder(sel, qty); setQty(1); setSel('')}} disabled={!sel} className="w-full py-5 text-lg shadow-lg" icon={Factory} variant="special">Comenzar Lote</Button>
      </Card>

      <Card className="p-8 shadow-xl bg-slate-900 text-white border border-slate-800">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-xl flex items-center gap-3"><Layers className="text-blue-400" /> Trabajo en Curso (WIP)</h3>
          <Badge type="process" text={orders.length.toString()} />
        </div>
        <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
          {orders.map((o:any) => (
            <div key={o.id} className="p-5 bg-slate-800/40 border border-slate-700 rounded-2xl flex justify-between items-center shadow-inner hover:bg-slate-800 transition-all group">
              <div>
                <p className="font-black text-blue-300 text-lg">{o.productName}</p>
                <div className="flex gap-4 mt-1">
                  <p className="text-xs text-slate-400 font-medium">Lote: <span className="text-white font-black">{o.qty}</span>u</p>
                  <p className="text-[10px] text-slate-500 italic mt-0.5">{new Date(o.startedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} hs</p>
                </div>
              </div>
              <Button onClick={() => onCompleteOrder(o)} variant="success" size="sm" className="shadow-lg shadow-emerald-900/40 group-hover:scale-105 transition-transform">Finalizar</Button>
            </div>
          ))}
          {orders.length === 0 && (
            <div className="text-center py-20 text-slate-600 flex flex-col items-center border-2 border-dashed border-slate-800 rounded-3xl">
              <Package size={48} className="mb-4 opacity-10" />
              <p className="italic font-medium">Línea de producción despejada</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default App;
