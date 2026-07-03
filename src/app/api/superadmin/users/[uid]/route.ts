import { NextResponse } from "next/server";

import { requireSuperAdminAuth } from "@/modules/superadmin/services/authService";
import {
  updateSuperAdminUser,
  validateSuperAdminUserInput,
} from "@/modules/superadmin/services/internalUserService";

function isValidUid(value: string): boolean {
  return value.trim().length > 0;
}

function getUserMutationError(error: unknown): { message: string; status: number } {
  if (error instanceof Error && error.message === "USER_NOT_FOUND") {
    return {
      message: "El usuario no existe en users/{uid}.",
      status: 404,
    };
  }

  if (error instanceof Error && error.message === "USER_AUTH_NOT_FOUND") {
    return {
      message: "El usuario no existe en Firebase Auth.",
      status: 404,
    };
  }

  if (error instanceof Error && error.message === "TENANT_NOT_FOUND") {
    return {
      message: "El tenant asignado no existe.",
      status: 404,
    };
  }

  if (error instanceof Error && error.message === "EMAIL_IMMUTABLE") {
    return {
      message: "El email no se puede editar desde este flujo.",
      status: 400,
    };
  }

  if (error instanceof Error && error.message === "SELF_LOCKOUT_FORBIDDEN") {
    return {
      message: "No puedes quitarte tu propio acceso superadmin ni desactivarte.",
      status: 400,
    };
  }

  return {
    message: "No se pudo actualizar el usuario.",
    status: 500,
  };
}

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/superadmin/users/[uid]">
) {
  const auth = await requireSuperAdminAuth(request);

  if (!auth.authorized) {
    return NextResponse.json(
      { success: false, message: auth.message },
      { status: auth.status }
    );
  }

  const { uid } = await context.params;

  if (!isValidUid(uid)) {
    return NextResponse.json(
      {
        success: false,
        message: "uid inválido.",
      },
      { status: 400 }
    );
  }

  try {
    const validation = validateSuperAdminUserInput(await request.json(), {
      isUpdate: true,
    });

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
      user: await updateSuperAdminUser(uid, validation.data, auth.uid),
    });
  } catch (error) {
    console.error("Error actualizando usuario interno desde superadmin:", error);

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
