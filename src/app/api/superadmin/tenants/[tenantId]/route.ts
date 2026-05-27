import { NextResponse } from "next/server";

import { requireSuperAdminAuth } from "@/modules/superadmin/services/authService";
import {
  deleteSuperAdminTenant,
  updateSuperAdminTenant,
  validateSuperAdminTenantInput,
} from "@/modules/superadmin/services/tenantService";

function isValidTenantId(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{2,60}$/.test(value);
}

function getTenantMutationError(error: unknown): { message: string; status: number } {
  if (error instanceof Error && error.message === "TENANT_NOT_FOUND") {
    return {
      message: "El tenant no existe.",
      status: 404,
    };
  }

  return {
    message: "No se pudo actualizar el tenant.",
    status: 500,
  };
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/superadmin/tenants/[tenantId]">
) {
  const auth = await requireSuperAdminAuth(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  const { tenantId } = await context.params;

  if (!isValidTenantId(tenantId)) {
    return NextResponse.json(
      {
        success: false,
        message: "tenantId inválido.",
      },
      { status: 400 }
    );
  }

  try {
    const validation = validateSuperAdminTenantInput(
      await request.json(),
      tenantId
    );

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
      tenant: await updateSuperAdminTenant(tenantId, validation.data),
    });
  } catch (error) {
    console.error("Error actualizando tenant desde superadmin:", error);

    const mutationError = getTenantMutationError(error);

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
  context: RouteContext<"/api/superadmin/tenants/[tenantId]">
) {
  const auth = await requireSuperAdminAuth(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  const { tenantId } = await context.params;

  if (!isValidTenantId(tenantId)) {
    return NextResponse.json(
      {
        success: false,
        message: "tenantId inválido.",
      },
      { status: 400 }
    );
  }

  try {
    await deleteSuperAdminTenant(tenantId);

    return NextResponse.json({
      success: true,
      tenant: null,
    });
  } catch (error) {
    console.error("Error eliminando tenant desde superadmin:", error);

    const mutationError = getTenantMutationError(error);

    return NextResponse.json(
      {
        success: false,
        message: mutationError.message,
      },
      { status: mutationError.status }
    );
  }
}
