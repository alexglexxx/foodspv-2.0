export interface Tenant {
  id: string;
  name: string;
  slug: string;

  phone: string;
  whatsappPhone?: string;

  logoUrl?: string;

  active: boolean;

  createdAt: Date;
  updatedAt: Date;
}
