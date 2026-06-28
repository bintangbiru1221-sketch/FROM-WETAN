import { createClient } from '../../../../lib/supabase/server';
import { getGmailAuthUrl } from '../../../../lib/gmail';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect('/login');

  // state = user.id, supaya callback tahu ini koneksi Gmail untuk user mana
  const url = getGmailAuthUrl(user.id);
  return NextResponse.redirect(url);
}

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect('/login');

  const url = getGmailAuthUrl(user.id);
  console.log('Generated Gmail Auth URL:', url); // Ini untuk debug
  return NextResponse.redirect(url);
}