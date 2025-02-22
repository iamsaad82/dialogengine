import { NextRequest, NextResponse } from "next/server";
import { getLayoutsForTemplate, createLayout, updateLayout, deleteLayout } from "@/lib/services/layout/LayoutService";
import { handleApiError } from "@/lib/utils/api";

export async function GET(
    request: NextRequest,
    { params }: { params: { templateId: string } }
) {
    try {
        const layouts = await getLayoutsForTemplate(params.templateId);
        return NextResponse.json(layouts);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: { templateId: string } }
) {
    try {
        const layoutData = await request.json();
        const newLayout = await createLayout(params.templateId, layoutData);
        return NextResponse.json(newLayout);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: { templateId: string } }
) {
    try {
        const layoutData = await request.json();
        const updatedLayout = await updateLayout(params.templateId, layoutData);
        return NextResponse.json(updatedLayout);
    } catch (error) {
        return handleApiError(error);
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: { templateId: string } }
) {
    try {
        const { searchParams } = new URL(request.url);
        const layoutId = searchParams.get("layoutId");
        if (!layoutId) {
            return NextResponse.json({ error: "Layout-ID ist erforderlich" }, { status: 400 });
        }
        await deleteLayout(params.templateId, layoutId);
        return NextResponse.json({ success: true });
    } catch (error) {
        return handleApiError(error);
    }
} 