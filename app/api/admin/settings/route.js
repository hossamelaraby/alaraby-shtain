import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-guard';

export async function GET(req) {
  const adminCheck = await requireAdmin(req);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const { supabase } = adminCheck;
  const { data, error } = await supabase
    .from('platform_settings')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ settings: data });
}

export async function POST(req) {
  const adminCheck = await requireAdmin(req);
  if (!adminCheck.ok) {
    return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
  }

  const body = await req.json().catch(() => ({}));
  const { id, updated_at, ...updateData } = body;

  const { supabase } = adminCheck;
  const { data, error } = await supabase
    .from('platform_settings')
    .update({ ...updateData, updated_at: new Date().toISOString() })
    .eq('id', 1)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, settings: data });
}
