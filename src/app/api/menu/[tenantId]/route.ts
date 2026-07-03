import { NextResponse } from "next/server";

import { adminDb } from "@/lib/firebase-admin";
import { hasDeletedAt, isTenantAvailable } from "@/modules/tenants/tenantAvailability";

interface TenantPublicRecord {
  active?: unknown;
  deletedAt?: unknown;
  status?: unknown;
  name?: unknown;
  greeting?: unknown;
  description?: unknown;
  rating?: unknown;
  reviews?: unknown;
  estimatedTime?: unknown;
  location?: unknown;
  heroImageUrl?: unknown;
  featuredCategory?: unknown;
  category?: unknown;
  visualPresetId?: unknown;
  deliveryConfig?: unknown;
  deliveryEnabled?: unknown;
  deliveryFee?: unknown;
}

interface ProductPublicRecord {
  tenantId?: unknown;
  name?: unknown;
  description?: unknown;
  price?: unknown;
  imageUrl?: unknown;
  images?: unknown;
  available?: unknown;
  active?: unknown;
  category?: unknown;
  options?: unknown;
  deletedAt?: unknown;
}

function isValidTenantId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,60}$/.test(value);
}

function toPublicTenant(record: TenantPublicRecord): TenantPublicRecord {
  return {
    name: record.name,
    greeting: record.greeting,
    description: record.description,
    rating: record.rating,
    reviews: record.reviews,
    estimatedTime: record.estimatedTime,
    location: record.location,
    heroImageUrl: record.heroImageUrl,
    featuredCategory: record.featuredCategory,
    category: record.category,
    visualPresetId: record.visualPresetId,
    deliveryConfig: record.deliveryConfig,
    deliveryEnabled: record.deliveryEnabled,
    deliveryFee: record.deliveryFee,
  };
}

function toPublicProduct(
  productId: string,
  tenantId: string,
  record: ProductPublicRecord
) {
  return {
    id: productId,
    tenantId,
    name: record.name,
    description: record.description,
    price: record.price,
    imageUrl: record.imageUrl,
    images: record.images,
    available: record.available,
    active: record.active,
    category: record.category,
    options: record.options,
  };
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/menu/[tenantId]">
) {
  const { tenantId } = await context.params;

  if (!isValidTenantId(tenantId)) {
    return NextResponse.json(
      { success: false, message: "tenantId inválido." },
      { status: 400 }
    );
  }

  const tenantSnapshot = await adminDb.collection("tenants").doc(tenantId).get();

  if (!tenantSnapshot.exists) {
    return NextResponse.json(
      { success: false, message: "El tenant no existe." },
      { status: 404 }
    );
  }

  const tenantRecord = tenantSnapshot.data() as TenantPublicRecord;

  if (!isTenantAvailable(tenantRecord)) {
    return NextResponse.json(
      { success: false, message: "El tenant no está disponible." },
      { status: 404 }
    );
  }

  const productsSnapshot = await adminDb
    .collection("tenants")
    .doc(tenantId)
    .collection("products")
    .get();

  const products = productsSnapshot.docs
    .map((document) => ({
      id: document.id,
      record: document.data() as ProductPublicRecord,
    }))
    .filter(({ record }) => {
      const active = typeof record.active === "boolean" ? record.active : true;
      const available =
        typeof record.available === "boolean" ? record.available : active;

      return active && available && !hasDeletedAt(record.deletedAt);
    })
    .map(({ id, record }) => toPublicProduct(id, tenantId, record));

  return NextResponse.json({
    success: true,
    tenant: toPublicTenant(tenantRecord),
    products,
  });
}
