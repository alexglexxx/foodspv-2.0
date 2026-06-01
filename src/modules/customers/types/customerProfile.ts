export interface CustomerAddress {
  id: string;
  label?: string;
  street: string;
  neighborhood?: string;
  references?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CustomerProfile {
  id: string;
  tenantId: string;
  customerCode: string;
  displayName: string;
  phone: string;
  phoneLast4: string;
  totalOrders: number;
  firstOrderAt?: Date;
  lastOrderAt?: Date;
  addresses: CustomerAddress[];
  notes?: string;
  blocked: boolean;
}
