import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// 获取用户支付方式
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const paymentMethods = await prisma.user_payment_methods.findMany({
      where: { 
        user_id: user.id
      },
      orderBy: [
        { is_default: "desc" },
        { created_at: "desc" }
      ]
    });

    const formattedPaymentMethods = paymentMethods.map(method => ({
      id: method.id,
      type: method.type.toLowerCase(),
      label: method.label,
      brand: method.brand,
      last4: method.last4,
      expiryMonth: method.expiry_month,
      expiryYear: method.expiry_year,
      isDefault: method.is_default,
      createdAt: method.created_at ? method.created_at.toISOString() : null,
      updatedAt: method.updated_at ? method.updated_at.toISOString() : null
    }));

    return NextResponse.json({ paymentMethods: formattedPaymentMethods });
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    return NextResponse.json(
      { error: "Failed to fetch payment methods" },
      { status: 500 }
    );
  }
}

// 创建用户支付方式
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      type,
      label,
      brand,
      last4,
      expiryMonth,
      expiryYear,
      isDefault = false
    } = await req.json();

    if (!type || !label) {
      return NextResponse.json(
        { error: "Type and label are required" },
        { status: 400 }
      );
    }

    // 如果设置为默认支付方式，先取消其他默认支付方式
    if (isDefault) {
      await prisma.user_payment_methods.updateMany({
        where: { 
          user_id: user.id,
          is_default: true
        },
        data: { is_default: false }
      });
    }

    const paymentMethod = await prisma.user_payment_methods.create({
      data: {
        user_id: user.id,
        type: type.toUpperCase(),
        label,
        brand,
        last4,
        expiry_month: expiryMonth,
        expiry_year: expiryYear,
        is_default: isDefault
      }
    });

    return NextResponse.json({
      message: "Payment method created successfully",
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type.toLowerCase(),
        label: paymentMethod.label,
        brand: paymentMethod.brand,
        last4: paymentMethod.last4,
        expiryMonth: paymentMethod.expiry_month,
        expiryYear: paymentMethod.expiry_year,
        isDefault: paymentMethod.is_default,
        createdAt: paymentMethod.created_at ? paymentMethod.created_at.toISOString() : null,
        updatedAt: paymentMethod.updated_at ? paymentMethod.updated_at.toISOString() : null
      }
    });
  } catch (error) {
    console.error("Error creating payment method:", error);
    return NextResponse.json(
      { error: "Failed to create payment method" },
      { status: 500 }
    );
  }
}

// 更新用户支付方式
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      paymentMethodId,
      type,
      label,
      brand,
      last4,
      expiryMonth,
      expiryYear,
      isDefault
    } = await req.json();

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method ID is required" },
        { status: 400 }
      );
    }

    // 验证支付方式属于用户
    const existingMethod = await prisma.user_payment_methods.findFirst({
      where: {
        id: paymentMethodId,
        user_id: user.id
      }
    });

    if (!existingMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    // 如果设置为默认支付方式，先取消其他默认支付方式
    if (isDefault) {
      await prisma.user_payment_methods.updateMany({
        where: { 
          user_id: user.id,
          is_default: true,
          id: { not: paymentMethodId }
        },
        data: { is_default: false }
      });
    }

    const updateData: any = {
      updated_at: new Date()
    };

    if (type !== undefined) updateData.type = type.toUpperCase();
    if (label !== undefined) updateData.label = label;
    if (brand !== undefined) updateData.brand = brand;
    if (last4 !== undefined) updateData.last4 = last4;
    if (expiryMonth !== undefined) updateData.expiry_month = expiryMonth;
    if (expiryYear !== undefined) updateData.expiry_year = expiryYear;
    if (isDefault !== undefined) updateData.is_default = isDefault;

    const paymentMethod = await prisma.user_payment_methods.update({
      where: { id: paymentMethodId },
      data: updateData
    });

    return NextResponse.json({
      message: "Payment method updated successfully",
      paymentMethod: {
        id: paymentMethod.id,
        type: paymentMethod.type.toLowerCase(),
        label: paymentMethod.label,
        brand: paymentMethod.brand,
        last4: paymentMethod.last4,
        expiryMonth: paymentMethod.expiry_month,
        expiryYear: paymentMethod.expiry_year,
        isDefault: paymentMethod.is_default,
        createdAt: paymentMethod.created_at ? paymentMethod.created_at.toISOString() : null,
        updatedAt: paymentMethod.updated_at ? paymentMethod.updated_at.toISOString() : null
      }
    });
  } catch (error) {
    console.error("Error updating payment method:", error);
    return NextResponse.json(
      { error: "Failed to update payment method" },
      { status: 500 }
    );
  }
}

// 删除用户支付方式
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const paymentMethodId = searchParams.get("paymentMethodId");

    if (!paymentMethodId) {
      return NextResponse.json(
        { error: "Payment method ID is required" },
        { status: 400 }
      );
    }

    // 验证支付方式属于用户
    const existingMethod = await prisma.user_payment_methods.findFirst({
      where: {
        id: parseInt(paymentMethodId),
        user_id: user.id
      }
    });

    if (!existingMethod) {
      return NextResponse.json(
        { error: "Payment method not found" },
        { status: 404 }
      );
    }

    // 硬删除
    await prisma.user_payment_methods.delete({
      where: { id: parseInt(paymentMethodId) }
    });

    return NextResponse.json({
      message: "Payment method deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting payment method:", error);
    return NextResponse.json(
      { error: "Failed to delete payment method" },
      { status: 500 }
    );
  }
}
