import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Share cards are generated client-side. Use the Share button in the results panel.',
  })
}
