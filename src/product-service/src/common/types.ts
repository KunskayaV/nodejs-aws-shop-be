export type TProduct = {
  id: string;
  title: string;
  description?: string;
  price: number;
}

export type TStockInfo = {
  product_id: string;
  count: number;
}

export type TCreateProductPayload = Omit<TProduct, 'id'> & { count?: number };