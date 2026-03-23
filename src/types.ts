export interface CafeItem {
  id: string;
  title: string;
  detail?: string;
  price: number;
  image?: string;
  category: string;
  unit?: string;
  status: 'In Stock' | 'Sold Out';
}

export interface CartItem extends CafeItem {
  quantity: number;
}

export interface Order {
  id?: string;
  items: CartItem[];
  totalAmount: number;
  timestamp: any;
  cashierId: string;
}
