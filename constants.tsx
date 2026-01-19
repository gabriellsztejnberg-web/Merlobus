
import React from 'react';
import { 
  LayoutDashboard, 
  Calculator, 
  Factory, 
  Package, 
  Layers, 
  Save, 
  FileText, 
  History 
} from 'lucide-react';
import { ViewType } from './types';

export const INITIAL_CATALOG = [
  { sku: 'ESP-STA-3-DER', marca: 'Starbus', modelo: '3', lado: 'Der', min: 5, stock: 10 },
  { sku: 'ESP-STA-3-IZQ', marca: 'Starbus', modelo: '3', lado: 'Izq', min: 5, stock: 8 },
  { sku: 'ESP-MAR-G7-DER', marca: 'Marcopolo', modelo: 'G7', lado: 'Der', min: 5, stock: 12 },
  { sku: 'ESP-MAR-G7-IZQ', marca: 'Marcopolo', modelo: 'G7', lado: 'Izq', min: 5, stock: 11 },
];

export const INITIAL_MPS = [
  { sku: 'MP-VID-01', desc: 'Vidrio Espejado 4mm', min: 20, stock: 100, pending: 0 },
  { sku: 'MP-PLA-ABS', desc: 'Carcasa Plástico ABS', min: 15, stock: 50, pending: 0 },
  { sku: 'MP-LED-AMB', desc: 'Módulo LED Ámbar', min: 30, stock: 200, pending: 0 },
  { sku: 'MP-CAB-15', desc: 'Cableado Interno 1.5m', min: 10, stock: 40, pending: 0 },
];

export const TABS = [
  { id: ViewType.DASHBOARD, label: 'Panel', icon: LayoutDashboard },
  { id: ViewType.OPERATIONS, label: 'Terminal de Planta', icon: Factory },
  { id: ViewType.PRODUCTS, label: 'Stock Real', icon: Package },
  { id: ViewType.RAW_MATERIALS, label: 'Mat. Primas', icon: Layers },
  { id: ViewType.RECIPES, label: 'Recetas / BOM', icon: Save },
  { id: ViewType.PLANNING, label: 'Simulador', icon: Calculator },
  { id: ViewType.HISTORY, label: 'Historial', icon: History }
];

export const BRAND_COLORS = {
  primary: '#2B3860',
  secondary: '#1e2844',
  accent: '#4F46E5',
  success: '#059669',
  danger: '#DC2626',
  warning: '#D97706'
};
