export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { generateAIResponse, generateAIResponseRich } from '@/lib/ai-responses';
import { VehiclesGeoJson, LocationsGeoJson, Delivery } from '@/lib/types';

function buildFleetContext(vehiclesData?: VehiclesGeoJson | null): string {
  if (!vehiclesData || !vehiclesData.features) return 'No fleet context provided.';
  const total = vehiclesData.features.length;
  const enRoute = vehiclesData.features.filter((v) => v.properties.state === 'en_route');
  const idle = vehiclesData.features.filter((v) => v.properties.state === 'idle');
  const offline = vehiclesData.features.filter((v) => v.properties.state === 'offline');
  const lowBattery = vehiclesData.features
    .filter((v) => (v.properties.battery || 0) < 30)
    .map((v) => `${v.properties.alias}:${v.properties.battery}%`)
    .slice(0, 10)
    .join(', ');
  return [
    `Total: ${total}`,
    `En route: ${enRoute.length}`,
    `Idle: ${idle.length}`,
    `Offline: ${offline.length}`,
    lowBattery ? `Low battery: ${lowBattery}` : undefined,
  ]
    .filter(Boolean)
    .join(' | ');
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    message?: string;
    vehiclesData?: VehiclesGeoJson | null;
    locationsData?: LocationsGeoJson | null;
    deliveriesData?: Delivery[] | null;
  };

  const message = body?.message || '';
  const vehiclesData = body?.vehiclesData || null;
  const locationsData = body?.locationsData || null;
  const deliveriesData = body?.deliveriesData || null;

  const apiKey = process.env.GOOGLE_AI_API_KEY;

  // Fallback to local rules if no API key configured
  if (!apiKey) {
    const rich = generateAIResponseRich(message, vehiclesData, locationsData, deliveriesData);
    return NextResponse.json({ ...rich, provider: 'local', usedFallback: true });
  }

  try {
    const context = buildFleetContext(vehiclesData);
    const systemPreamble =
      'You are a concise, helpful Fleet Operations Assistant. Respond in clear, plain English. If asked about fleet metrics, use the provided context. Keep answers short and actionable.';
    const prompt = `${systemPreamble}\n\nFleet context: ${context}\n\nUser: ${message}`;

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 512,
          },
        }),
      }
    );

    if (!res.ok) {
      throw new Error(`Gemini API returned ${res.status}`);
    }

    const data = await res.json();
    const reply =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || '').join('') ||
      data?.candidates?.[0]?.output_text ||
      'Sorry, I could not generate a response.';

    return NextResponse.json({ reply, provider: 'gemini', usedFallback: false });
  } catch (error) {
    const rich = generateAIResponseRich(message, vehiclesData, locationsData, deliveriesData);
    return NextResponse.json({ ...rich, provider: 'local', usedFallback: true });
  }
}


