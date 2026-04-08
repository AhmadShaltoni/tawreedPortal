import { apiError, apiResponse, corsOptions } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { signInSchema, signUpSchema } from "@/lib/validations";
import { compare, hash } from "bcryptjs";
import * as jwt from "next-auth/jwt";
import { NextRequest } from "next/server";

// Handle preflight requests
export async function OPTIONS() {
  return corsOptions();
}

// POST /api/v1/auth/login
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    if (action === "register") {
      return handleRegister(body);
    }

    return handleLogin(body);
  } catch (error) {
    console.error("Auth request error:", error);
    return apiError("خطأ في معالجة الطلب", 400);
  }
}

async function handleLogin(body: Record<string, unknown>) {
  try {
    const validated = signInSchema.safeParse(body);
    if (!validated.success) {
      return apiError("صيغة الهاتف أو كلمة المرور غير صحيحة", 400);
    }

    const user = await db.user.findUnique({
      where: { phone: validated.data.phone },
    });

    if (!user || !user.isActive) {
      return apiError("رقم الهاتف أو كلمة المرور غير صحيحة", 401);
    }

    const isPasswordValid = await compare(
      validated.data.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      return apiError("رقم الهاتف أو كلمة المرور غير صحيحة", 401);
    }

    // Register device token if provided
    if (body.deviceToken && body.platform) {
      const platform = body.platform as string;
      if (['IOS', 'ANDROID'].includes(platform)) {
        try {
          // Check if token already exists for another user
          const existingToken = await db.deviceToken.findUnique({
            where: { token: body.deviceToken as string },
          });

          if (existingToken && existingToken.userId !== user.id) {
            await db.deviceToken.delete({
              where: { id: existingToken.id },
            });
          }

          // Upsert device token
          await db.deviceToken.upsert({
            where: { token: body.deviceToken as string },
            update: {
              userId: user.id,
              isActive: true,
              updatedAt: new Date(),
            },
            create: {
              token: body.deviceToken as string,
              platform: platform as 'IOS' | 'ANDROID',
              userId: user.id,
              isActive: true,
            },
          });
        } catch (tokenError) {
          console.error('Device token registration error:', tokenError);
          // Don't fail login if token registration fails
        }
      }
    }

    // Generate JWT token
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      console.error("AUTH_SECRET not configured");
      return apiError("خطأ في إعدادات الخادم", 500);
    }

    const token = await jwt.encode({
      token: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        role: user.role,
        storeName: user.storeName,
      },
      secret,
      salt: "",
    });

    return apiResponse({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        storeName: user.storeName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return apiError("حدث خطأ في تسجيل الدخول", 500);
  }
}

async function handleRegister(body: Record<string, unknown>) {
  try {
    const validated = signUpSchema.safeParse(body);
    if (!validated.success) {
      const errors = validated.error.flatten().fieldErrors;
      const firstError =
        Object.values(errors)[0]?.[0] || "فشل التحقق من البيانات";
      return apiError(firstError, 400);
    }

    // التحقق من وجود رقم الهاتف
    const existing = await db.user.findUnique({
      where: { phone: validated.data.phone },
    });
    if (existing) {
      return apiError("هذا الهاتف مسجل بالفعل", 409);
    }

    const { password, confirmPassword, ...rest } = validated.data;
    const passwordHash = await hash(password, 12);

    const user = await db.user.create({
      data: {
        ...rest,
        passwordHash,
        deliveryAreas: [],
        isVerified: false,
        isActive: true,
      },
    });

    // Register device token if provided
    if (body.deviceToken && body.platform) {
      const platform = body.platform as string;
      if (['IOS', 'ANDROID'].includes(platform)) {
        try {
          await db.deviceToken.create({
            data: {
              token: body.deviceToken as string,
              platform: platform as 'IOS' | 'ANDROID',
              userId: user.id,
              isActive: true,
            },
          });
        } catch (tokenError) {
          console.error('Device token registration error during signup:', tokenError);
          // Don't fail registration if token registration fails
        }
      }
    }

    // توليد token للدخول التلقائي
    const secret = process.env.AUTH_SECRET;
    if (!secret) {
      console.error("AUTH_SECRET not configured");
      return apiError("خطأ في إعدادات الخادم", 500);
    }

    const token = await jwt.encode({
      token: {
        id: user.id,
        phone: user.phone,
        username: user.username,
        role: user.role,
        storeName: user.storeName,
      },
      secret,
      salt: "",
    });

    return apiResponse(
      {
        token,
        user: {
          id: user.id,
          phone: user.phone,
          username: user.username,
          storeName: user.storeName,
          role: user.role,
        },
      },
      201,
    );
  } catch (error) {
    console.error("Register error:", error);
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return apiError("هذا الهاتف مسجل بالفعل", 409);
    }
    return apiError("حدث خطأ في إنشاء الحساب", 500);
  }
}
