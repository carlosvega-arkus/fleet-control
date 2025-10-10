/**
 * Next.js API Route for AI chat interactions.
 * 
 * Handles POST requests with chat history and fleet context, relays them to
 * the Groq LLM API (Llama-3 model) if API key is set, otherwise falls back to local AI logic.
 * Wraps responses in a standardized shape for the frontend.
 * 
 * @fileoverview AI chat endpoint: Accepts conversation messages and fleet data, returns an AI-powered reply and intent.
 * 
 * Exports:
 * - dynamic: Forces dynamic rendering for this route.
 * - revalidate: Disables ISR (no cache).
 * - runtime: Specifies Node.js runtime for the API route.
 * - POST: Main handler for chat-to-AI requests.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import {
  VehiclesGeoJson,
  LocationsGeoJson,
  Delivery,
  Message,
} from "@/lib/types";
import { getContext, localFallback } from "@/lib/ia-context";

/**
 * Handle incoming chat POST requests for AI assistant.
 *
 * Expected input body (JSON):
 *   - messages: Array of Message (chat history)
 *   - vehiclesData: VehiclesGeoJson | null
 *   - locationsData: LocationsGeoJson | null
 *   - deliveriesData: Delivery[] | null
 *
 * Returns JSON response:
 *   - reply: string
 *   - intent: object|null
 *   - provider: "groq"|"local"
 *   - usedFallback: boolean
 *
 * Logic:
 *   - If no GROQ_API_KEY, use localFallback AI for the latest user message.
 *   - Otherwise, format system/context + chat history and call Groq Llama-3 model.
 *   - Parse response content as JSON. If invalid, wrap as { reply, intent: null, malformed: true }
 *   - On error, fallback to localFallback.
 *
 * @param {Request} req - Incoming HTTP request
 * @returns {Promise<Response>} JSON AI reply including "reply" and "intent"
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    messages?: Message[];
    vehiclesData?: VehiclesGeoJson | null;
    locationsData?: LocationsGeoJson | null;
    deliveriesData?: Delivery[] | null;
  };

  const messages = body?.messages || [];
  const vehiclesData = body?.vehiclesData || null;
  const locationsData = body?.locationsData || null;
  const deliveriesData = body?.deliveriesData || null;

  const apiKey = process.env.GROQ_API_KEY;

  // If no API Key, use local fallback
  if (!apiKey) {
    const lastMessage = messages[messages.length - 1]?.content || "Hello";
    const fallbackResponse = localFallback(
      lastMessage,
      vehiclesData,
      locationsData,
      deliveriesData
    );
    return NextResponse.json(fallbackResponse);
  }

  try {
    const context = getContext({ vehiclesData, locationsData, deliveriesData });

    // Include context as first message, then all history
    const formattedMessages = [
      { role: "system", content: context },
      ...messages.map((msg) => ({
        role: msg.type === "user" ? "user" : "assistant",
        content: msg.content,
      })),
    ];

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: formattedMessages,
        temperature: 0.3,
        max_tokens: 512,
      }),
    });

    if (!res.ok) throw new Error(`Groq API returned ${res.status}`);

    const data = await res.json();
    const rawContent =
      data?.choices?.[0]?.message?.content?.trim() ||
      '{"reply": "Sorry, I could not generate a response.", "intent": null}';

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      // si el modelo no devolvió un JSON válido
      parsed = {
        reply: rawContent,
        intent: null,
        malformed: true,
      };
    }

    return NextResponse.json({
      ...parsed,
      provider: "groq",
      usedFallback: false,
    });
  } catch (error) {
    console.log("Error calling Groq API:", error);
    // Local fallback in case of error
    const lastMessage = messages[messages.length - 1]?.content || "Hello";
    const fallbackResponse = localFallback(
      lastMessage,
      vehiclesData,
      locationsData,
      deliveriesData
    );
    return NextResponse.json(fallbackResponse);
  }
}
