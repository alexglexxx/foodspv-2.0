import { NextResponse } from "next/server";

import { requireSuperAdminAuth } from "@/modules/superadmin/services/authService";
import {
  createSuperAdminTenant,
  listSuperAdminTenants,
  validateSuperAdminTenantInput,
} from "@/modules/superadmin/services/tenantService";

function getTenantMutationError(error: unknown): { message: string; status: number } {
  if (error instanceof Error && error.message === "TENANT_ALREADY_EXISTS") {
    return {
      message: "Ya existe un tenant con ese tenantId.",
      status: 409,
    };
  }

  return {
    message: "No se pudo guardar el tenant.",
    status: 500,
  };
}

export async function GET(request: Request) {
  const auth = await requireSuperAdminAuth(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    return NextResponse.json({
      success: true,
      tenants: await listSuperAdminTenants(),
    });
  } catch (error) {
    console.error("Error listando tenants para superadmin:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudieron cargar los tenants.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const auth = await requireSuperAdminAuth(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  try {
    const validation = validateSuperAdminTenantInput(await request.json());

    if (!validation.valid) {
      return NextResponse.json(
        {
          success: false,
          message: validation.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        tenant: await createSuperAdminTenant(validation.data),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando tenant desde superadmin:", error);

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
