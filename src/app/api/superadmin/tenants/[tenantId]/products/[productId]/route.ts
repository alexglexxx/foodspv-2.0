import { NextResponse } from "next/server";

import { requireSuperAdminAuth } from "@/modules/superadmin/services/authService";
import {
  deleteSuperAdminTenantProduct,
  updateSuperAdminTenantProduct,
  validateSuperAdminProductInput,
} from "@/modules/superadmin/services/productService";

function isValidTenantId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,60}$/.test(value);
}

function isValidProductId(value: string): boolean {
  return value.length > 0 && value.length <= 150 && !value.includes("/");
}

function getProductMutationError(error: unknown): {
  message: string;
  status: number;
} {
  if (error instanceof Error && error.message === "TENANT_NOT_FOUND") {
    return {
      message: "El tenant no existe.",
      status: 404,
    };
  }

  if (error instanceof Error && error.message === "PRODUCT_NOT_FOUND") {
    return {
      message: "El producto no existe.",
      status: 404,
    };
  }

  return {
    message: "No se pudo actualizar el producto.",
    status: 500,
  };
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/superadmin/tenants/[tenantId]/products/[productId]">
) {
  const auth = await requireSuperAdminAuth(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  const { tenantId, productId } = await context.params;

  if (!isValidTenantId(tenantId)) {
    return NextResponse.json(
      {
        success: false,
        message: "tenantId inválido.",
      },
      { status: 400 }
    );
  }

  if (!isValidProductId(productId)) {
    return NextResponse.json(
      {
        success: false,
        message: "productId inválido.",
      },
      { status: 400 }
    );
  }

  try {
    const validation = validateSuperAdminProductInput(await request.json());

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      product: await updateSuperAdminTenantProduct(
        tenantId,
        productId,
        validation.data
      ),
    });
  } catch (error) {
    console.error("Error actualizando producto desde superadmin:", error);

    const mutationError = getProductMutationError(error);

    return NextResponse.json(
      {
        success: false,
        message: mutationError.message,
      },
      { status: mutationError.status }
    );
  }
}

export async function DELETE(
  request: Request,
  context: RouteContext<"/api/superadmin/tenants/[tenantId]/products/[productId]">
) {
  const auth = await requireSuperAdminAuth(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  const { tenantId, productId } = await context.params;

  if (!isValidTenantId(tenantId)) {
    return NextResponse.json(
      {
        success: false,
        message: "tenantId inválido.",
      },
      { status: 400 }
    );
  }

  if (!isValidProductId(productId)) {
    return NextResponse.json(
      {
        success: false,
        message: "productId inválido.",
      },
      { status: 400 }
    );
  }

  try {
    await deleteSuperAdminTenantProduct(tenantId, productId);

    return NextResponse.json({
      success: true,
      product: null,
    });
  } catch (error) {
    console.error("Error desactivando producto desde superadmin:", error);

    const mutationError = getProductMutationError(error);

    return NextResponse.json(
      {
        success: false,
        message: mutationError.message,
      },
      { status: mutationError.status }
    );
  }
}
