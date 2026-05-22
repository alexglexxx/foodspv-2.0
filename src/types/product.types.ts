export interface Product {

  id: string;

  tenantId: string;

  name: string;

  description?: string;

  price: number;

  imageUrl?: string;

  available: boolean;

  category?: string;
}
