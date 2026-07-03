import { NextResponse } from "next/server";

import { requireSuperAdminAuth } from "@/modules/superadmin/services/authService";
import {
  createSuperAdminUser,
  listSuperAdminUsers,
  validateSuperAdminUserInput,
} from "@/modules/superadmin/services/internalUserService";

function getUserMutationError(error: unknown): { message: string; status: number } {
  if (error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") {
    return {
      message: "Ya existe un usuario con ese email.",
      status: 409,
    };
  }

  if (error instanceof Error && error.message === "TENANT_NOT_FOUND") {
    return {
      message: "El tenant asignado no existe.",
      status: 404,
    };
  }

  return {
    message: "No se pudo guardar el usuario.",
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
      users: await listSuperAdminUsers(),
    });
  } catch (error) {
    console.error("Error listando usuarios internos para superadmin:", error);

    return NextResponse.json(
      {
        success: false,
        message: "No se pudieron cargar los usuarios internos.",
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
    const validation = validateSuperAdminUserInput(await request.json());

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
        user: await createSuperAdminUser(validation.data),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creando usuario interno desde superadmin:", error);

    const mutationError = getUserMutationError(error);

    return NextResponse.json(
      {
        success: false,
        message: mutationError.message,
      },
      { status: mutationError.status }
    );
  }
}
