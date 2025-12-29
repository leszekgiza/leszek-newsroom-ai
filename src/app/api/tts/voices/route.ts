import { NextResponse } from "next/server";

const VOICES = [
  {
    id: "pl-PL-MarekNeural",
    name: "Marek",
    language: "Polski",
    gender: "male",
  },
  {
    id: "pl-PL-ZofiaNeural",
    name: "Zofia",
    language: "Polski",
    gender: "female",
  },
  {
    id: "en-US-GuyNeural",
    name: "Guy",
    language: "English",
    gender: "male",
  },
  {
    id: "en-US-JennyNeural",
    name: "Jenny",
    language: "English",
    gender: "female",
  },
];

export async function GET() {
  return NextResponse.json({ voices: VOICES });
}
