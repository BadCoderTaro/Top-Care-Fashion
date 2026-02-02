import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

// 获取用户地址
export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const addresses = await prisma.user_addresses.findMany({
      where: { user_id: user.id },
      orderBy: [
        { is_default: "desc" },
        { created_at: "desc" }
      ]
    });

    const formattedAddresses = addresses.map(address => ({
      id: address.id,
      type: address.type ? address.type.toLowerCase() : null,
      name: address.name,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state,
      postalCode: address.postal_code,
      country: address.country,
      isDefault: address.is_default,
      createdAt: address.created_at ? address.created_at.toISOString() : null,
      updatedAt: address.updated_at ? address.updated_at.toISOString() : null
    }));

    return NextResponse.json({ addresses: formattedAddresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
      { status: 500 }
    );
  }
}

// 创建用户地址
export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      type = "HOME",
      name,
      phone,
      line1,
      line2,
      city,
      state,
      postalCode,
      country,
      isDefault = false
    } = await req.json();

    if (!name || !phone || !line1 || !city || !state || !postalCode || !country) {
      return NextResponse.json(
        { error: "All required fields must be provided" },
        { status: 400 }
      );
    }

    // 如果设置为默认地址，先取消其他默认地址
    if (isDefault) {
      await prisma.user_addresses.updateMany({
        where: { 
          user_id: user.id,
          is_default: true
        },
        data: { is_default: false }
      });
    }

    const address = await prisma.user_addresses.create({
      data: {
        user_id: user.id,
        type: type.toUpperCase(),
        name,
        phone,
        line1,
        line2,
        city,
        state,
        postal_code: postalCode,
        country,
        is_default: isDefault
      }
    });

    return NextResponse.json({
      message: "Address created successfully",
      address: {
        id: address.id,
        type: address.type ? address.type.toLowerCase() : null,
        name: address.name,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postal_code,
        country: address.country,
        isDefault: address.is_default,
        createdAt: address.created_at ? address.created_at.toISOString() : null,
        updatedAt: address.updated_at ? address.updated_at.toISOString() : null
      }
    });
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}

// 更新用户地址
export async function PUT(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const {
      addressId,
      type,
      name,
      phone,
      line1,
      line2,
      city,
      state,
      postalCode,
      country,
      isDefault
    } = await req.json();

    if (!addressId) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 }
      );
    }

    // 验证地址属于用户
    const existingAddress = await prisma.user_addresses.findFirst({
      where: {
        id: addressId,
        user_id: user.id
      }
    });

    if (!existingAddress) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    // 如果设置为默认地址，先取消其他默认地址
    if (isDefault) {
      await prisma.user_addresses.updateMany({
        where: { 
          user_id: user.id,
          is_default: true,
          id: { not: addressId }
        },
        data: { is_default: false }
      });
    }

    const updateData: any = {
      updated_at: new Date()
    };

    if (type !== undefined) updateData.type = type.toUpperCase();
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (line1 !== undefined) updateData.line1 = line1;
    if (line2 !== undefined) updateData.line2 = line2;
    if (city !== undefined) updateData.city = city;
    if (state !== undefined) updateData.state = state;
    if (postalCode !== undefined) updateData.postal_code = postalCode;
    if (country !== undefined) updateData.country = country;
    if (isDefault !== undefined) updateData.is_default = isDefault;

    const address = await prisma.user_addresses.update({
      where: { id: addressId },
      data: updateData
    });

    return NextResponse.json({
      message: "Address updated successfully",
      address: {
        id: address.id,
        type: address.type ? address.type.toLowerCase() : null,
        name: address.name,
        phone: address.phone,
        line1: address.line1,
        line2: address.line2,
        city: address.city,
        state: address.state,
        postalCode: address.postal_code,
        country: address.country,
        isDefault: address.is_default,
        createdAt: address.created_at ? address.created_at.toISOString() : null,
        updatedAt: address.updated_at ? address.updated_at.toISOString() : null
      }
    });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

// 删除用户地址
export async function DELETE(req: NextRequest) {
  try {
    const user = await getSessionUser(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const addressId = searchParams.get("addressId");

    if (!addressId) {
      return NextResponse.json(
        { error: "Address ID is required" },
        { status: 400 }
      );
    }

    // 验证地址属于用户
    const existingAddress = await prisma.user_addresses.findFirst({
      where: {
        id: parseInt(addressId),
        user_id: user.id
      }
    });

    if (!existingAddress) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    await prisma.user_addresses.delete({
      where: { id: parseInt(addressId) }
    });

    return NextResponse.json({
      message: "Address deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
}
