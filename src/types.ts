export interface ExpenseItem {
  id: string;
  description: string;
  amount: number;
  category: string;
}

export interface CategoryTotal {
  category: string;
  amount: number;
}

export interface ExpenseReport {
  id: string;
  userId?: string;
  createdAt: string;
  updatedAt: string;
  sourceText: string;
  raw_items: string[];
  categorized_items: ExpenseItem[];
  category_totals: CategoryTotal[];
  total_amount: number;
  highest_category: string;
  insights: string[];
  recommendations: string[];
  monthReference: string;
}

export type Category = 
  | 'alimentação'
  | 'transporte'
  | 'moradia'
  | 'saúde'
  | 'lazer'
  | 'educação'
  | 'compras'
  | 'outros';
