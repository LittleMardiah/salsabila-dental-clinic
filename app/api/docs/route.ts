export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server';
import { swaggerSpec } from '@/lib/swagger';
import swaggerUi from 'swagger-ui-react';
import { renderToStaticMarkup } from 'react-dom/server';

export async function GET() {
  // Untuk HTML Swagger UI, kita buat halaman terpisah di /docs
  // Atau return JSON spec untuk Swagger UI client-side
  return NextResponse.json(swaggerSpec);
}