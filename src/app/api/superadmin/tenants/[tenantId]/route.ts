import { NextResponse } from "next/server";

import { requireSuperAdminAuth } from "@/modules/superadmin/services/authService";
import {
  deleteSuperAdminTenant,
  getSuperAdminTenant,
  updateSuperAdminTenantPartial,
} from "@/modules/superadmin/services/tenantService";
import { DESIGN_PRESETS_BY_CATEGORY } from "@/modules/design/tenantDesignPresets";
import { validateTenantUpdateInput } from "@/modules/tenants/tenantUpdateValidator";

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
    const currentTenant = await getSuperAdminTenant(tenantId);

    if (!currentTenant) {
      return NextResponse.json(
        {
          success: false,
          message: "El tenant no existe.",
        },
        { status: 404 }
      );
    }

    const validation = validateTenantUpdateInput(await request.json(), currentTenant);

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.message,
        },
        { status: 400 }
      );
    }

    const tenant = await updateSuperAdminTenantPartial(tenantId, validation.data);

    return NextResponse.json({
      success: true,
      tenant,
      availableDesignPresets: DESIGN_PRESETS_BY_CATEGORY[tenant.category],
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

export async function GET(
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
    const tenant = await getSuperAdminTenant(tenantId);

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          message: "El tenant no existe.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      tenant,
      availableDesignPresets: DESIGN_PRESETS_BY_CATEGORY[tenant.category],
    });
  } catch (error) {
    console.error("Error cargando tenant desde superadmin:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudo cargar el tenant.",
      },
      { status: 500 }
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
