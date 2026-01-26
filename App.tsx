
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@supabase/supabase-js';
import { 
  Package, LogOut, Factory, AlertCircle, BrainCircuit, Loader2, 
  ArrowRight, Layers, Globe, History, LayoutDashboard, Calculator,
  Settings, Save, Plus, Trash2, CheckCircle, Truck, ArrowUpRight, X, 
  ShoppingCart, Download, ClipboardCheck, FileUp, Edit2, Search, FileText, Printer, Hammer, Calendar, User, FileDigit
} from 'lucide-react';
import { 
  ViewType, Product, RawMaterial, Recipe, ProductionOrder, Movement, UserProfile 
} from './types';
import { TABS, INITIAL_CATALOG } from './constants';
import { Card, Button, Input, Badge, SectionHeader } from './components/UI';
import { getAIInventoryAdvice } from './services/geminiService';

const SUPABASE_URL = "https://ackljuztzpklddssbovs.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFja2xqdXp0enBrbGRkc3Nib3ZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3ODQ3OTUsImV4cCI6MjA4NDM2MDc5NX0.Rf7HFaLikmKelpikr_3CiQsfzjS5sHp3T-HTv75XXyE";

const K = {
  PRODUCTS: 'mb_prods_v4',
  MPS: 'mb_mps_v4',
  RECIPES: 'mb_recipes_v4',
  ORDERS: 'mb_orders_v4',
  HISTORY: 'mb_history_v4',
  USER: 'mb_user_v4'
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
  const [showAddMp, setShowAddMp] = useState(false);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchMpQuery, setSearchMpQuery] = useState('');

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

        if (pRes.data) {
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

  const handleUpdateProductField = async (id: string, field: keyof Product, value: any) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
    if (isOnline) await supabase.from('products').update({ [field]: value }).eq('id', id);
  };

  const handleUpdateMpField = async (id: string, field: keyof RawMaterial, value: any) => {
    setMps(prev => prev.map(m => m.id === id ? { ...m, [field]: value } : m));
    if (isOnline) await supabase.from('mps').update({ [field]: value }).eq('id', id);
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('¿Eliminar permanentemente este SKU?')) {
      setProducts(prev => prev.filter(p => p.id !== id));
      if (isOnline) await supabase.from('products').delete().eq('id', id);
    }
  };

  const handleDeleteMp = async (id: string) => {
    if (confirm('¿Eliminar permanentemente este insumo?')) {
      setMps(prev => prev.filter(m => m.id !== id));
      if (isOnline) await supabase.from('mps').delete().eq('id', id);
    }
  };

  const handleMpEntry = async (id: string, qty: number) => {
    const mp = mps.find(m => m.id === id);
    if (!mp) return;
    const newStock = (mp.stock || 0) + qty;
    await handleUpdateMpField(id, 'stock', newStock);
    logMovement('INGRESO_MP', `+${qty}u de ${mp.desc || mp.sku}`);
  };

  const handleProductDispatch = async (id: string, qty: number, extra?: { cliente?: string, remito?: string, fecha?: string }) => {
    const p = products.find(x => x.id === id);
    if (!p) return;
    if (p.stock < qty) { alert('Stock insuficiente para despacho'); return; }
    
    const newStock = p.stock - qty;
    await handleUpdateProductField(id, 'stock', newStock);
    
    let detalle = `-${qty}u de ${p.sku}`;
    if (extra?.cliente) detalle += ` | Cliente: ${extra.cliente}`;
    if (extra?.remito) detalle += ` | Remito: ${extra.remito}`;
    if (extra?.fecha) detalle += ` | Fecha Despacho: ${extra.fecha}`;
    
    logMovement('DESPACHO', detalle);
  };

  const handleStartProduction = async (targetId: string, targetType: 'product' | 'mp', qty: number) => {
    const target = targetType === 'product' ? products.find(p => p.id === targetId) : mps.find(m => m.id === targetId);
    if (!target) return;

    const productRecipes = recipes.filter(r => r.targetId === targetId && r.targetType === targetType);
    const missingMaterials: string[] = [];
    
    productRecipes.forEach(r => {
      const mp = mps.find(m => m.id === r.mpId);
      const required = r.qty * qty;
      if (!mp || mp.stock < required) {
        missingMaterials.push(`${mp?.desc || mp?.sku || 'Insumo'} (Falta: ${required - (mp?.stock || 0)}u)`);
      }
    });

    if (missingMaterials.length > 0) {
      alert(`⚠️ PRODUCCIÓN NO INICIADA\n\nFaltan componentes en stock:\n${missingMaterials.join('\n')}\n\nPor favor, reponga los materiales antes de continuar.`);
      return; // Block production strictly as requested
    }

    const updatedMps = [...mps];
    for (const r of productRecipes) {
      const required = r.qty * qty;
      const mpIndex = updatedMps.findIndex(m => m.id === r.mpId);
      if (mpIndex !== -1) {
        updatedMps[mpIndex].stock -= required;
        if (isOnline) await supabase.from('mps').update({ stock: updatedMps[mpIndex].stock }).eq('id', updatedMps[mpIndex].id);
      }
    }
    setMps(updatedMps);

    const newOrder: ProductionOrder = { 
      id: Math.random().toString(36).substr(2, 9), 
      targetId, targetType, productName: target.sku, qty, 
      status: 'in_progress', startedAt: new Date().toISOString(), 
      startedBy: user?.name || 'Sistema' 
    };
    
    setOrders(prev => [newOrder, ...prev]);
    
    if (targetType === 'product') {
      const newWip = (target.wip || 0) + qty;
      setProducts(prev => prev.map(p => p.id === targetId ? { ...p, wip: newWip } : p));
      if (isOnline) await supabase.from('products').update({ wip: newWip }).eq('id', targetId);
    } else {
      const newWip = ((target as RawMaterial).wip || 0) + qty;
      setMps(prev => prev.map(m => m.id === targetId ? { ...m, wip: newWip } : m));
      if (isOnline) await supabase.from('mps').update({ wip: newWip }).eq('id', targetId);
    }

    logMovement('PRODUCCION_INICIO', `Iniciado: ${qty}u de ${target.sku}`);
    if (isOnline) await supabase.from('orders').insert([newOrder]);
  };

  const handleCompleteOrder = async (order: ProductionOrder) => {
    if (order.targetType === 'product') {
      const prod = products.find(p => p.id === order.targetId);
      if (prod) {
        const newStock = (prod.stock || 0) + order.qty;
        const newWip = Math.max(0, (prod.wip || 0) - order.qty);
        setProducts(prev => prev.map(p => p.id === prod.id ? { ...p, stock: newStock, wip: newWip } : p));
        if (isOnline) await supabase.from('products').update({ stock: newStock, wip: newWip }).eq('id', prod.id);
      }
    } else {
      const mp = mps.find(m => m.id === order.targetId);
      if (mp) {
        const newStock = (mp.stock || 0) + order.qty;
        const newWip = Math.max(0, (mp.wip || 0) - order.qty);
        setMps(prev => prev.map(m => m.id === mp.id ? { ...m, stock: newStock, wip: newWip } : m));
        if (isOnline) await supabase.from('mps').update({ stock: newStock, wip: newWip }).eq('id', mp.id);
      }
    }
    setOrders(prev => prev.filter(o => o.id !== order.id));
    logMovement('PRODUCCION_FIN', `Finalizado: ${order.qty}u de ${order.productName}`);
    if (isOnline) await supabase.from('orders').update({ status: 'completed' }).eq('id', order.id);
  };

  const handleAddRecipeItem = async (targetId: string, targetType: 'product' | 'mp', mpId: string, qty: number) => {
    const newRecipe: Recipe = { id: Math.random().toString(36).substr(2, 9), targetId, targetType, mpId, qty };
    const updatedRecipes = [...recipes, newRecipe];
    setRecipes(updatedRecipes);
    localStorage.setItem(K.RECIPES, JSON.stringify(updatedRecipes));
    if (isOnline) await supabase.from('recipes').insert([newRecipe]);
  };

  const handleDeleteRecipeItem = async (id: string) => {
    const updatedRecipes = recipes.filter(r => r.id !== id);
    setRecipes(updatedRecipes);
    localStorage.setItem(K.RECIPES, JSON.stringify(updatedRecipes));
    if (isOnline) await supabase.from('recipes').delete().eq('id', id);
  };

  const handleCsvUpload = async (event: React.ChangeEvent<HTMLInputElement>, target: 'products' | 'mps') => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result as string;
      const lines = text.split(/\r?\n/);
      const newItems: any[] = [];
      lines.forEach((line, i) => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const separator = trimmed.includes(';') ? ';' : ',';
        const cols = trimmed.split(separator).map(c => c.trim().replace(/^"|"$/g, ''));
        if (i === 0 && (cols[0].toLowerCase().includes('sku') || cols[1]?.toLowerCase().includes('marca') || cols[1]?.toLowerCase().includes('desc'))) return;
        if (target === 'products') {
          newItems.push({ id: Math.random().toString(36).substr(2, 9), sku: cols[0], marca: cols[1], modelo: cols[2], lado: cols[3], min: parseInt(cols[4]) || 5, stock: parseInt(cols[5]) || 0, wip: 0 });
        } else {
          newItems.push({ id: Math.random().toString(36).substr(2, 9), sku: cols[0], desc: cols[1], min: parseInt(cols[2]) || 10, stock: parseInt(cols[3]) || 0, pending: 0, wip: 0 });
        }
      });
      if (newItems.length > 0) {
        if (target === 'products') { setProducts(prev => [...newItems, ...prev]); if (isOnline) await supabase.from('products').insert(newItems); }
        else { setMps(prev => [...newItems, ...prev]); if (isOnline) await supabase.from('mps').insert(newItems); }
        logMovement('CARGA_MASIVA', `Importados ${newItems.length} registros`);
      }
    };
    reader.readAsText(file);
    event.target.value = ""; 
  };

  if (loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-[#F1F5F9] flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 shadow-2xl bg-white rounded-[2.5rem]">
          <div className="text-center mb-10">
            <div className="bg-[#2B3860] w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl text-white"><Package size={40} /></div>
            <h1 className="text-3xl font-black text-[#2B3860]">Merlobus Pro</h1>
          </div>
          <form onSubmit={(e) => {
            e.preventDefault();
            if (tempName.trim()) {
              const newUser: UserProfile = { name: tempName, role: 'admin' };
              setUser(newUser);
              localStorage.setItem(K.USER, JSON.stringify(newUser));
            }
          }} className="space-y-6">
            <Input autoFocus placeholder="Nombre de Operario" value={tempName} onChange={e => setTempName(e.target.value)} />
            <Button type="submit" className="w-full py-4" icon={ArrowRight}>Entrar</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      
      <div className="print-report p-10 bg-white">
        <div className="flex justify-between items-end border-b-2 border-[#2B3860] pb-4 mb-8">
          <div><h1 className="text-2xl font-black text-[#2B3860]">MERLOBUS STOCK</h1><p className="text-sm text-slate-500 font-bold uppercase">Reporte de Inventario Completo</p></div>
          <div className="text-right text-xs"><p><strong>Fecha:</strong> {new Date().toLocaleDateString()}</p><p><strong>Operario:</strong> {user.name}</p></div>
        </div>
        <h2 className="text-lg font-bold mb-4 bg-slate-100 p-2">Espejos</h2>
        <table className="w-full mb-10">
          <thead><tr><th>SKU</th><th>Marca/Modelo</th><th>Min</th><th>Stock</th><th>Taller</th></tr></thead>
          <tbody>{products.map(p=><tr key={p.id} className={p.stock < p.min ? 'critical-stock' : ''}><td>{p.sku}</td><td>{p.marca} {p.modelo}</td><td>{p.min}</td><td>{p.stock}</td><td>{p.wip}</td></tr>)}</tbody>
        </table>
        <h2 className="text-lg font-bold mb-4 bg-slate-100 p-2">Materias Primas</h2>
        <table className="w-full">
          <thead><tr><th>Código</th><th>Descripción</th><th>Min</th><th>Stock</th></tr></thead>
          <tbody>{mps.map(m=><tr key={m.id} className={m.stock < m.min ? 'critical-stock' : ''}><td>{m.sku}</td><td>{m.desc}</td><td>{m.min}</td><td>{m.stock}</td></tr>)}</tbody>
        </table>
      </div>

      <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm sticky top-0 z-50 no-print">
        <div className="flex items-center gap-4">
          <div className="bg-[#2B3860] p-2 rounded-xl text-white"><Package size={24} /></div>
          <span className="font-black text-xl text-[#2B3860] tracking-tight uppercase">MERLOBUS</span>
        </div>
        <div className="flex items-center gap-4">
          <Badge type={isOnline ? 'ok' : 'warn'} text={isOnline ? 'EN NUBE' : 'MODO LOCAL'} />
          <button onClick={() => {setUser(null); localStorage.removeItem(K.USER)}} className="p-2 text-slate-400 hover:text-red-500 transition-colors"><LogOut /></button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden no-print">
        <aside className="w-20 lg:w-64 bg-white border-r p-4 flex flex-col gap-2 shadow-sm overflow-y-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id as ViewType)} className={`flex items-center gap-3 p-4 rounded-xl transition-all ${activeTab === tab.id ? 'bg-[#2B3860] text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}>
              <tab.icon size={20} />
              <span className="hidden lg:block font-bold text-sm">{tab.label}</span>
            </button>
          ))}
        </aside>

        <main className="flex-1 overflow-y-auto p-6 lg:p-10">
          {activeTab === ViewType.DASHBOARD && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <SectionHeader title="Panel General" subtitle={`Bienvenido, ${user.name}`} />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <StatCard title="Total Espejos" value={products.reduce((a, b) => a + b.stock, 0)} icon={Package} color="blue" />
                <StatCard title="En Taller" value={products.reduce((a, b) => a + (b.wip || 0), 0) + mps.reduce((a, b) => a + (b.wip || 0), 0)} icon={Factory} color="blue" />
                <StatCard title="Insumos Stock" value={mps.reduce((a, b) => a + b.stock, 0)} icon={Layers} color="blue" />
                <StatCard title="Alertas Stock" value={products.filter(p => p.stock < p.min).length + mps.filter(m => m.stock < m.min).length} icon={AlertCircle} color="red" />
              </div>
              <div className="mt-8">
                 <Button onClick={() => { setIsAiLoading(true); getAIInventoryAdvice(products, mps).then(setAiAdvice).finally(()=>setIsAiLoading(false)) }} disabled={isAiLoading} variant="special" icon={BrainCircuit} className="h-12 px-6">
                  {isAiLoading ? 'Pensando...' : 'Consultar Asistente Merlobus'}
                </Button>
                {aiAdvice.length > 0 && (
                  <Card className="p-6 bg-indigo-50 border-indigo-200 mt-4 ai-advice">
                    <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2"><BrainCircuit size={18} /> Sugerencias Estratégicas</h3>
                    <ul className="space-y-2">
                      {aiAdvice.map((a, i) => <li key={i} className="text-sm text-indigo-700 bg-white/50 p-3 rounded-lg border border-indigo-100 font-medium">• {a}</li>)}
                    </ul>
                  </Card>
                )}
              </div>
            </div>
          )}

          {activeTab === ViewType.PLANNING && <PlanningView products={products} mps={mps} recipes={recipes} />}

          {activeTab === ViewType.OPERATIONS && (
            <OperationsManager 
              products={products} mps={mps} recipes={recipes} orders={orders} 
              onStartOrder={handleStartProduction} onCompleteOrder={handleCompleteOrder} onMpEntry={handleMpEntry}
            />
          )}

          {activeTab === ViewType.RECIPES && (
            <RecipeManager products={products} mps={mps} recipes={recipes} onAddRecipeItem={handleAddRecipeItem} onDeleteRecipeItem={handleDeleteRecipeItem} />
          )}

          {activeTab === ViewType.RAW_MATERIALS && (
            <div className="space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <SectionHeader title="Materias Primas" subtitle="Gestión de insumos y materiales" />
                <div className="flex gap-2">
                  <Button onClick={() => window.print()} variant="secondary" icon={Printer}>Imprimir Reporte</Button>
                  <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all font-medium text-xs shadow-sm">
                    <FileUp size={16} /> Carga CSV
                    <input type="file" accept=".csv" className="hidden" onChange={(e) => handleCsvUpload(e, 'mps')} />
                  </label>
                  <Button onClick={() => setShowAddMp(true)} icon={Plus}>Nuevo Insumo</Button>
                </div>
              </div>
              <div className="flex gap-2 mb-4">
                 <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input placeholder="Filtrar por código o descripción..." className="pl-10" value={searchMpQuery} onChange={e => setSearchMpQuery(e.target.value)} />
                 </div>
              </div>
              {showAddMp && (
                <Card className="p-6 mb-6 bg-emerald-50 border-emerald-200 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-4"><h3 className="font-bold">Nuevo Insumo</h3><button onClick={()=>setShowAddMp(false)}><X/></button></div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const newMp = { id: Math.random().toString(36).substr(2, 9), sku: fd.get('sku') as string, desc: fd.get('desc') as string, min: Number(fd.get('min')), stock: Number(fd.get('stock')), pending: 0, wip: 0 };
                    setMps(prev => [newMp, ...prev]);
                    setShowAddMp(false);
                  }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input name="sku" placeholder="Código" required />
                    <Input name="desc" placeholder="Descripción" required />
                    <Input name="min" type="number" placeholder="Mínimo" defaultValue="10" />
                    <Input name="stock" type="number" placeholder="Stock" defaultValue="0" />
                    <Button type="submit" variant="success">Guardar</Button>
                  </form>
                </Card>
              )}
              <InventoryTable data={mps.filter(m => m.desc.toLowerCase().includes(searchMpQuery.toLowerCase()) || m.sku.toLowerCase().includes(searchMpQuery.toLowerCase()))} type="mps" onUpdateField={handleUpdateMpField} onDelete={handleDeleteMp} onAction={handleMpEntry} />
            </div>
          )}

          {activeTab === ViewType.PRODUCTS && (
            <div className="space-y-8">
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                 <SectionHeader title="Stock Real (Espejos)" subtitle="Control de productos terminados listos para despacho" />
                 <div className="flex gap-2">
                   <Button onClick={() => window.print()} variant="secondary" icon={Printer}>Imprimir Reporte</Button>
                   <label className="flex items-center gap-2 cursor-pointer bg-slate-100 px-4 py-2 rounded-lg hover:bg-slate-200 transition-all font-medium text-xs shadow-sm">
                      <FileUp size={16} /> Carga CSV
                      <input type="file" accept=".csv" className="hidden" onChange={(e) => handleCsvUpload(e, 'products')} />
                    </label>
                   <Button onClick={() => setShowAddProduct(true)} icon={Plus}>Nuevo SKU</Button>
                 </div>
               </div>
               <div className="flex gap-2 mb-4">
                 <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input placeholder="Filtrar por SKU..." className="pl-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                 </div>
              </div>
              {showAddProduct && (
                 <Card className="p-6 mb-6 bg-blue-50 border-blue-200 animate-in slide-in-from-top-2">
                  <div className="flex justify-between items-center mb-4"><h3 className="font-bold">Nuevo Espejo</h3><button onClick={()=>setShowAddProduct(false)}><X/></button></div>
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget);
                    const newProd = { id: Math.random().toString(36).substr(2, 9), sku: fd.get('sku') as string, marca: fd.get('marca') as string, modelo: fd.get('modelo') as string, lado: fd.get('lado') as string, min: Number(fd.get('min')), stock: Number(fd.get('stock')), wip: 0 };
                    setProducts(prev => [newProd, ...prev]);
                    setShowAddProduct(false);
                  }} className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Input name="sku" placeholder="SKU" required />
                    <Input name="marca" placeholder="Marca" required />
                    <Input name="modelo" placeholder="Modelo" />
                    <Input name="lado" placeholder="Lado" />
                    <Input name="min" type="number" placeholder="Mín" defaultValue="5" />
                    <Input name="stock" type="number" placeholder="Stock" defaultValue="0" />
                    <Button type="submit">Guardar</Button>
                  </form>
                </Card>
              )}
              <InventoryTable data={products.filter(p => p.sku.toLowerCase().includes(searchQuery.toLowerCase()))} type="products" onUpdateField={handleUpdateProductField} onDelete={handleDeleteProduct} onAction={handleProductDispatch} />
            </div>
          )}

          {activeTab === ViewType.REPORTS && (
            <div className="max-w-2xl mx-auto py-10">
              <SectionHeader title="Datos y Nube" />
              <Card className="p-10 text-center space-y-6 bg-white shadow-xl">
                <Globe size={64} className={`mx-auto ${isOnline ? 'text-emerald-500' : 'text-slate-300'}`} />
                <h3 className="text-2xl font-black text-slate-800">{isOnline ? 'Sincronizado' : 'Modo Local'}</h3>
                <div className="flex flex-col md:flex-row gap-4">
                  <Button onClick={() => window.location.reload()} className="flex-1">Refrescar</Button>
                  <Button variant="secondary" onClick={() => window.print()} className="flex-1" icon={Printer}>Imprimir PDF</Button>
                  <Button variant="secondary" onClick={() => {
                    const data = { products, mps, recipes, history };
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `merlobus_backup_${new Date().toISOString().split('T')[0]}.json`; a.click();
                  }} className="flex-1" icon={Download}>Respaldar Datos</Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === ViewType.HISTORY && (
            <div className="space-y-6">
              <SectionHeader title="Movimientos de Inventario" />
              <Card className="overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-slate-800 text-white text-[10px] uppercase font-black">
                    <tr><th className="p-4">Timestamp</th><th className="p-4">Tipo</th><th className="p-4">Detalle</th><th className="p-4 text-right">Usuario</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {history.map(h => (
                      <tr key={h.id} className="text-xs hover:bg-slate-50 transition-colors">
                        <td className="p-4 text-slate-400">{new Date(h.ts).toLocaleString()}</td>
                        <td className="p-4"><span className="font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">{h.tipo}</span></td>
                        <td className="p-4 italic text-slate-600">{h.detalle}</td>
                        <td className="p-4 text-right uppercase text-slate-400 font-bold">{h.user}</td>
                      </tr>
                    ))}
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
    <Card className="p-6 flex items-center gap-5 hover:shadow-md transition-shadow">
      <div className={`p-4 rounded-2xl ${colors[color]}`}><Icon size={28} /></div>
      <div><p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">{title}</p><p className="text-3xl font-black text-[#2B3860]">{value}</p></div>
    </Card>
  );
};

const InventoryTable = ({ data, type, onUpdateField, onDelete, onAction }: any) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeActionId, setActiveActionId] = useState<string | null>(null);
  
  // States for Dispatch
  const [qtyInput, setQtyInput] = useState<number>(1);
  const [cliente, setCliente] = useState('');
  const [remito, setRemito] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);

  return (
    <Card className="overflow-hidden border-none shadow-lg">
      <table className="w-full text-left">
        <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400">
          <tr>
            <th className="p-4">SKU / Insumo</th>
            {type === 'products' ? <th className="p-4">Marca / Modelo</th> : <th className="p-4">Descripción</th>}
            <th className="p-4 text-center">Mínimo</th>
            <th className="p-4 text-center">Stock</th>
            <th className="p-4 text-center">Taller (WIP)</th>
            <th className="p-4 text-right no-print">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((item: any) => {
            const isEditing = editingId === item.id;
            const isActionActive = activeActionId === item.id;
            const isLow = item.stock < item.min;
            return (
              <React.Fragment key={item.id}>
                <tr className={`hover:bg-slate-50 transition-all text-sm ${isEditing ? 'bg-blue-50/50' : ''}`}>
                  <td className="p-4 font-bold text-slate-600">
                    {isEditing ? <Input value={item.sku} onChange={e => onUpdateField(item.id, 'sku', e.target.value)} className="w-40" /> : item.sku}
                  </td>
                  <td className="p-4 text-slate-500">
                    {isEditing ? (
                      type === 'products' ? (
                        <div className="flex gap-1">
                          <Input value={item.marca} onChange={e => onUpdateField(item.id, 'marca', e.target.value)} placeholder="Marca" />
                          <Input value={item.modelo} onChange={e => onUpdateField(item.id, 'modelo', e.target.value)} placeholder="Modelo" />
                        </div>
                      ) : (
                        <Input value={item.desc} onChange={e => onUpdateField(item.id, 'desc', e.target.value)} />
                      )
                    ) : (
                      type === 'products' ? `${item.marca} ${item.modelo}` : item.desc
                    )}
                  </td>
                  <td className="p-4 text-center">
                    <Input type="number" className="w-20 mx-auto text-center" value={item.min} onChange={e => onUpdateField(item.id, 'min', parseInt(e.target.value) || 0)} />
                  </td>
                  <td className="p-4 text-center">
                    <Input type="number" className={`w-20 mx-auto text-center font-bold ${isLow ? 'text-red-600 bg-red-50' : 'text-emerald-600'}`} value={item.stock} onChange={e => onUpdateField(item.id, 'stock', parseInt(e.target.value) || 0)} />
                  </td>
                  <td className="p-4 text-center font-black text-blue-600">{item.wip || 0}</td>
                  <td className="p-4 text-right no-print">
                    <div className="flex justify-end items-center gap-1">
                      <button onClick={() => {
                        setActiveActionId(isActionActive ? null : item.id);
                        setQtyInput(1);
                        setCliente('');
                        setRemito('');
                        setFecha(new Date().toISOString().split('T')[0]);
                      }} title={type === 'products' ? "Despachar" : "Ingresar"} className={`p-2 rounded-lg transition-colors ${isActionActive ? 'bg-emerald-600 text-white shadow-md' : 'text-emerald-600 hover:bg-emerald-50'}`}><Truck size={16}/></button>
                      <button onClick={() => setEditingId(isEditing ? null : item.id)} title="Editar Información" className={`p-2 rounded-lg transition-colors ${isEditing ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-100'}`}>{isEditing ? <CheckCircle size={16}/> : <Edit2 size={16}/>}</button>
                      <button onClick={() => onDelete(item.id)} className="p-2 text-red-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={16}/></button>
                    </div>
                  </td>
                </tr>
                {isActionActive && (
                  <tr className="bg-slate-50/80 animate-in slide-in-from-top-1">
                    <td colSpan={6} className="p-4 border-l-4 border-l-emerald-500">
                      <div className="flex flex-wrap items-end gap-4">
                        <div className="flex-none">
                          <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block">Cantidad</label>
                          <Input type="number" className="w-20 font-bold" value={qtyInput} onChange={e => setQtyInput(Number(e.target.value))} />
                        </div>
                        {type === 'products' && (
                          <>
                            <div className="flex-1 min-w-[150px]">
                              <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block flex items-center gap-1"><User size={10}/> Cliente (Opcional)</label>
                              <Input placeholder="Nombre del cliente" value={cliente} onChange={e => setCliente(e.target.value)} />
                            </div>
                            <div className="flex-1 min-w-[150px]">
                              <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block flex items-center gap-1"><FileDigit size={10}/> Remito/Factura (Opcional)</label>
                              <Input placeholder="Nro de comprobante" value={remito} onChange={e => setRemito(e.target.value)} />
                            </div>
                            <div className="flex-none">
                              <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block flex items-center gap-1"><Calendar size={10}/> Fecha</label>
                              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
                            </div>
                          </>
                        )}
                        <div className="flex-none flex gap-2">
                          <Button variant="success" size="sm" onClick={() => { 
                            onAction(item.id, qtyInput, type === 'products' ? { cliente, remito, fecha } : undefined); 
                            setActiveActionId(null); 
                          }}>Confirmar {type === 'products' ? 'Despacho' : 'Ingreso'}</Button>
                          <Button variant="secondary" size="sm" onClick={() => setActiveActionId(null)}>Cancelar</Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
};

const RecipeManager = ({ products, mps, recipes, onAddRecipeItem, onDeleteRecipeItem }: any) => {
  const [targetType, setTargetType] = useState<'product' | 'mp'>('product');
  const [selId, setSelId] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [selMpId, setSelMpId] = useState('');
  const [qty, setQty] = useState(1);
  const currentRecipes = recipes.filter((r: any) => r.targetId === selId && r.targetType === targetType);
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-in fade-in">
      <Card className="p-6 h-fit space-y-4 shadow-xl">
        <h3 className="font-bold text-slate-800">Definir Receta / Composición</h3>
        <div className="flex gap-2">
          <button onClick={() => {setTargetType('product'); setSelId('');}} className={`flex-1 p-2 rounded-lg text-[10px] font-black uppercase transition-all ${targetType === 'product' ? 'bg-[#2B3860] text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>ESPEJOS</button>
          <button onClick={() => {setTargetType('mp'); setSelId('');}} className={`flex-1 p-2 rounded-lg text-[10px] font-black uppercase transition-all ${targetType === 'mp' ? 'bg-[#2B3860] text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>ESTRUCTURAS</button>
        </div>
        <select className="w-full p-3 border rounded-xl font-bold text-slate-700 bg-slate-50 focus:ring-2 focus:ring-[#2B3860] outline-none" value={selId} onChange={e=>setSelId(e.target.value)}>
          <option value="">-- Seleccionar Item --</option>
          {targetType === 'product' ? products.map((p:any) => <option key={p.id} value={p.id}>{p.sku}</option>) : mps.map((m:any) => <option key={m.id} value={m.id}>{m.desc || m.sku}</option>)}
        </select>
      </Card>
      <Card className="md:col-span-2 p-8 min-h-[500px] shadow-2xl relative">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-black text-xl text-slate-800 tracking-tight">Componentes Requeridos</h3>
          <Button variant="secondary" size="sm" icon={Plus} disabled={!selId} onClick={() => setShowAdd(!showAdd)}>{showAdd ? 'Cancelar' : 'Añadir Insumo'}</Button>
        </div>
        {showAdd && (
          <div className="bg-blue-50 p-4 rounded-xl mb-6 grid grid-cols-3 gap-3 animate-in slide-in-from-top-2 border border-blue-100">
            <select className="col-span-2 p-2 border rounded-lg bg-white font-bold text-slate-700" value={selMpId} onChange={e=>setSelMpId(e.target.value)}>
               <option value="">-- Elegir Componente --</option>
               {mps.map((m:any) => m.id !== selId && <option key={m.id} value={m.id}>{m.desc || m.sku}</option>)}
            </select>
            <Input type="number" min="0.01" step="0.01" value={qty} onChange={e=>setQty(Number(e.target.value))} className="text-center font-bold" />
            <Button className="col-span-3" variant="success" onClick={() => { if(selMpId && qty > 0) { onAddRecipeItem(selId, targetType, selMpId, qty); setShowAdd(false); setSelMpId(''); setQty(1); } else { alert('Elegir insumo y cantidad'); } }}>Confirmar Adición</Button>
          </div>
        )}
        <div className="space-y-3">
          {currentRecipes.map((r:any) => (
            <div key={r.id} className="p-4 border rounded-xl flex justify-between items-center bg-white hover:border-blue-300 group transition-all shadow-sm">
              <span className="font-bold text-slate-700">{mps.find((m:any)=>m.id === r.mpId)?.desc || mps.find((m:any)=>m.id === r.mpId)?.sku || 'Item Desconocido'}</span>
              <div className="flex items-center gap-6">
                <span className="font-black text-blue-700 text-lg">{r.qty} u.</span>
                <button onClick={() => onDeleteRecipeItem(r.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"><Trash2 size={18}/></button>
              </div>
            </div>
          ))}
          {selId && currentRecipes.length === 0 && <p className="text-center py-20 text-slate-300 italic font-medium">Este item no tiene componentes asignados.</p>}
          {!selId && <div className="h-full flex flex-col items-center justify-center text-slate-200 py-20"><Settings size={64} className="mb-4 opacity-10" /><p className="text-lg">Selecciona un producto a la izquierda para ver su receta</p></div>}
        </div>
      </Card>
    </div>
  );
};

const OperationsManager = ({ products, mps, recipes, orders, onStartOrder, onCompleteOrder, onMpEntry }: any) => {
  const [mode, setMode] = useState<'product' | 'mp'>('product');
  const [selId, setSelId] = useState('');
  const [qty, setQty] = useState(1);
  const [selMpEntry, setSelMpEntry] = useState('');
  const [qtyMpEntry, setQtyMpEntry] = useState(1);
  const previewReqs = useMemo(() => {
    if (!selId) return [];
    return recipes.filter((r:any) => r.targetId === selId && r.targetType === mode).map((r:any) => {
      const mp = mps.find((m:any)=>m.id === r.mpId);
      const needed = r.qty * qty;
      return { name: mp?.desc || mp?.sku, stock: mp?.stock || 0, needed, ok: (mp?.stock || 0) >= needed };
    });
  }, [selId, qty, recipes, mps, mode]);
  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="p-8 space-y-6 shadow-xl border-t-4 border-t-[#2B3860] bg-white">
          <div className="flex justify-between items-center">
            <h3 className="font-black text-2xl text-slate-800">Lanzar Producción</h3>
            <div className="flex bg-slate-100 p-1 rounded-lg">
              <button onClick={()=>setMode('product')} className={`px-4 py-1.5 text-[10px] font-black rounded uppercase transition-all ${mode==='product' ? 'bg-white shadow-md text-[#2B3860]':'text-slate-400'}`}>ESPEJOS</button>
              <button onClick={()=>setMode('mp')} className={`px-4 py-1.5 text-[10px] font-black rounded uppercase transition-all ${mode==='mp' ? 'bg-white shadow-md text-[#2B3860]':'text-slate-400'}`}>ESTRUCTURAS</button>
            </div>
          </div>
          <div className="space-y-4">
            <select className="w-full p-4 border rounded-xl text-lg font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-[#2B3860]" value={selId} onChange={e=>setSelId(e.target.value)}>
              <option value="">-- Seleccionar SKU --</option>
              {mode==='product' ? products.map((p:any)=><option key={p.id} value={p.id}>{p.sku}</option>) : mps.map((m:any)=> recipes.some((r:any)=>r.targetId===m.id && r.targetType==='mp') && <option key={m.id} value={m.id}>{m.desc || m.sku}</option>)}
            </select>
            <Input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} className="text-2xl font-black h-16 text-center border-2 border-slate-100 bg-slate-50" />
          </div>
          {selId && (
            <div className="bg-slate-50 p-5 rounded-xl space-y-3 border border-slate-200">
               <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Verificación de Componentes</p>
               {previewReqs.map((req:any, i:number) => (
                 <div key={i} className="flex justify-between text-xs items-center">
                    <span className={`font-bold ${req.ok ? 'text-slate-600' : 'text-red-600 flex items-center gap-1'}`}>{!req.ok && <AlertCircle size={12}/>} {req.name}</span>
                    <span className={req.ok ? 'text-emerald-600 font-bold' : 'text-red-600 font-black'}>{req.needed} u.</span>
                 </div>
               ))}
               {previewReqs.length === 0 && <p className="text-xs italic text-amber-600 font-medium">Este producto no tiene componentes definidos. Se cargará stock sin descontar insumos.</p>}
            </div>
          )}
          <Button className="w-full py-5 text-xl font-black shadow-lg" variant="special" icon={Factory} disabled={!selId} onClick={()=>{onStartOrder(selId, mode, qty); setSelId(''); setQty(1);}}>EMPEZAR TRABAJO</Button>
        </Card>
        <Card className="p-8 space-y-6 shadow-xl border-t-4 border-t-emerald-600 bg-white">
          <h3 className="font-black text-2xl text-slate-800 flex items-center gap-3"><Truck className="text-emerald-600"/> Ingreso de Materias Primas</h3>
          <div className="space-y-4">
            <select className="w-full p-4 border rounded-xl text-lg font-bold bg-slate-50 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-600" value={selMpEntry} onChange={e=>setSelMpEntry(e.target.value)}>
              <option value="">-- Seleccionar Insumo --</option>
              {mps.map((m:any) => <option key={m.id} value={m.id}>{m.desc || m.sku}</option>)}
            </select>
            <Input type="number" min="1" value={qtyMpEntry} onChange={e=>setQtyMpEntry(Number(e.target.value))} className="text-2xl font-black h-16 text-center border-2 border-slate-100 bg-slate-50" />
          </div>
          <Button className="w-full py-5 text-xl font-black shadow-lg" variant="success" icon={Truck} disabled={!selMpEntry} onClick={()=>{onMpEntry(selMpEntry, qtyMpEntry); setSelMpEntry(''); setQtyMpEntry(1);}}>REGISTRAR INGRESO</Button>
        </Card>
        <Card className="p-8 shadow-2xl bg-[#0f172a] text-white lg:col-span-2 rounded-3xl border border-slate-800">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-black text-2xl flex items-center gap-4"><Hammer className="text-blue-400" /> Línea de Montaje Activa</h3>
            <Badge type="process" text={`${orders.length} órdenes`} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {orders.map((o:any) => (
              <div key={o.id} className="p-6 bg-slate-800/40 border border-slate-700 rounded-3xl flex flex-col justify-between items-start gap-4 transition-all hover:bg-slate-800 hover:scale-[1.02] shadow-xl group">
                <div className="w-full">
                  <div className="flex justify-between items-start mb-2">
                    <Badge type={o.targetType === 'mp' ? 'warn' : 'info'} text={o.targetType === 'mp' ? 'SEMIE' : 'FINAL'} />
                    <span className="text-[10px] font-mono text-slate-500 font-bold uppercase">{new Date(o.startedAt).toLocaleTimeString()}</span>
                  </div>
                  <p className="font-black text-white text-xl leading-tight mb-1">{o.productName}</p>
                  <p className="text-sm text-blue-400 font-black">LOTE: {o.qty} UNIDADES</p>
                </div>
                <Button onClick={() => onCompleteOrder(o)} variant="success" size="lg" className="w-full text-base font-black shadow-lg group-hover:bg-emerald-500 transition-colors">TERMINAR</Button>
              </div>
            ))}
            {orders.length === 0 && <div className="col-span-full text-center py-24 text-slate-700 border-4 border-dashed border-slate-800/50 rounded-3xl flex flex-col items-center justify-center gap-4 italic"><Package size={48} className="opacity-10"/><p className="text-xl">No hay trabajos en curso actualmente</p></div>}
          </div>
        </Card>
      </div>
    </div>
  );
};

const PlanningView = ({ products, mps, recipes }: any) => {
  const [sel, setSel] = useState('');
  const [qty, setQty] = useState(1);
  const requirements = recipes
    .filter((r:any) => r.targetId === sel)
    .map((r:any) => ({ mp: mps.find((m:any) => m.id === r.mpId), needed: r.qty * qty }));
  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-2 duration-500">
      <SectionHeader title="Planificación de Lotes (Explosión)" subtitle="Proyecta cuántos materiales necesitas antes de empezar a fabricar" />
      <Card className="p-8 bg-[#2B3860] text-white flex flex-col md:flex-row gap-8 items-end shadow-2xl rounded-3xl border-none">
        <div className="flex-1 w-full"><label className="text-[10px] font-black uppercase text-blue-300 mb-3 block tracking-widest">Modelo a Proyectar</label>
          <select className="w-full p-4 rounded-2xl text-slate-900 font-black bg-white focus:ring-4 focus:ring-blue-400 outline-none transition-all shadow-inner" value={sel} onChange={e=>setSel(e.target.value)}>
            <option value="">-- Seleccionar --</option>
            {products.map((p:any)=><option key={p.id} value={p.id}>{p.sku} ({p.marca})</option>)}
          </select>
        </div>
        <div className="w-full md:w-32"><label className="text-[10px] font-black uppercase text-blue-300 mb-3 block tracking-widest">Unidades</label>
          <Input type="number" min="1" value={qty} onChange={e=>setQty(Number(e.target.value))} className="p-4 font-black text-center text-slate-900 h-[60px] text-2xl rounded-2xl border-none shadow-inner" />
        </div>
      </Card>
      {sel ? (
        <Card className="p-8 shadow-2xl bg-white rounded-3xl border-none">
          <h3 className="font-black text-2xl mb-8 text-slate-800 border-b-4 border-slate-50 pb-4">Necesidades de Insumos para {qty}u</h3>
          <table className="w-full">
            <thead className="text-[10px] uppercase font-black text-slate-400">
              <tr className="border-b-2 border-slate-50"><th className="pb-4 text-left">Insumo / Componente</th><th className="pb-4 text-center">En Stock</th><th className="pb-4 text-center">Faltante / Sobrante</th><th className="pb-4 text-center">Requerido</th><th className="pb-4 text-right">Estado</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requirements.map((req:any, i:number) => {
                const diff = (req.mp?.stock || 0) - req.needed;
                return (
                  <tr key={i} className="text-sm group hover:bg-slate-50 transition-colors">
                    <td className="py-5 font-black text-slate-700">{req.mp?.desc || req.mp?.sku || 'Insumo'}</td>
                    <td className="py-5 text-center font-bold text-slate-400">{req.mp?.stock || 0}</td>
                    <td className={`py-5 text-center font-black ${diff >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{diff >= 0 ? `+${diff}` : diff}</td>
                    <td className="py-5 text-center font-black text-blue-600 text-lg">{req.needed}</td>
                    <td className="py-5 text-right">{diff >= 0 ? <Badge type="ok" text="OK" /> : <Badge type="danger" text={`COMPRAR ${Math.abs(diff)}`} />}</td>
                  </tr>
                );
              })}
              {requirements.length === 0 && <tr><td colSpan={5} className="py-24 text-center italic text-slate-300 flex flex-col items-center justify-center gap-4"><AlertCircle size={48} className="opacity-10"/><p className="text-xl">Este producto no tiene una receta definida aún.</p></td></tr>}
            </tbody>
          </table>
        </Card>
      ) : <div className="text-center py-32 text-slate-300 italic font-medium border-4 border-dashed border-slate-100 rounded-3xl">Selecciona un modelo para ver la explosión de materiales</div>}
    </div>
  );
};

export default App;
