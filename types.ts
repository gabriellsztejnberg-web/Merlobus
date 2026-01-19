
export enum ViewType {
  DASHBOARD = 'dashboard',
  PLANNING = 'planning',
  OPERATIONS = 'operations',
  PRODUCTS = 'products',
  RAW_MATERIALS = 'mps',
  RECIPES = 'recipes',
  HISTORY = 'history',
  REPORTS = 'reports'
}

export interface Product {
  id: string;
  sku: string;
  marca: string;
  modelo: string;
  lado: string;
  min: number;
  stock: number;
  createdAt?: any;
}

export interface RawMaterial {
  id: string;
  sku: string;
  desc: string;
  min: number;
  stock: number;
  pending: number;
  createdAt?: any;
}

export interface Recipe {
  id: string;
  prodId: string;
  mpId: string;
  qty: number;
}

export interface ProductionOrder {
  id: string;
  prodId: string;
  productName: string;
  qty: number;
  status: 'in_progress' | 'completed';
  startedAt: any;
  startedBy: string;
}

export interface Movement {
  id: string;
  ts: any;
  tipo: string;
  detalle: string;
  user: string;
}

export interface UserProfile {
  name: string;
  role: 'admin' | 'operator' | 'viewer';
}
