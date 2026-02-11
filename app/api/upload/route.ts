// ============================================================================
// POST /api/upload — Upload a file to Pinata IPFS (free tier)
// ============================================================================
// This runs on the server so the PINATA_JWT stays secret.
// The client sends a FormData with a "file" field.
// We forward it to Pinata and return the IPFS CID (hash).
// ============================================================================

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const jwt = process.env.PINATA_JWT;
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const fileBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", fileBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const documentHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    // ── If Pinata is not configured, fall back to a local content hash ──
    if (!jwt || jwt === "your_pinata_jwt_token_here") {
      return NextResponse.json({
        success: true,
        ipfsHash: "Qm" + documentHash.slice(0, 44),
        documentHash,
        fileName: file.name,
        fileSize: file.size,
        pinned: false, // Not actually on IPFS — just a local hash
        message: "Pinata not configured — using local content hash. Set PINATA_JWT in .env.local for real IPFS.",
      });
    }

    // Validate file
    const validTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Use PDF, PNG, or JPG." }, { status: 400 });
    }
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
    }

    // Build the FormData for Pinata
    const pinataForm = new FormData();
    pinataForm.append("file", file);

    const metadata = JSON.stringify({
      name: `edulocka-cert-${Date.now()}`,
      keyvalues: {
        app: "edulocka",
        type: "certificate-document",
        originalName: file.name,
        documentHash,
      },
    });
    pinataForm.append("pinataMetadata", metadata);

    const options = JSON.stringify({ cidVersion: 0 });
    pinataForm.append("pinataOptions", options);

    // Upload to Pinata
    const pinataResponse = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${jwt}`,
      },
      body: pinataForm,
    });

    if (!pinataResponse.ok) {
      const errorText = await pinataResponse.text();
      console.error("Pinata error:", errorText);
      return NextResponse.json(
        { error: "IPFS upload failed. Check your Pinata API key." },
        { status: 502 }
      );
    }

    const pinataData = await pinataResponse.json();

    return NextResponse.json({
      success: true,
      ipfsHash: pinataData.IpfsHash,
      documentHash,
      fileName: file.name,
      fileSize: pinataData.PinSize,
      pinned: true,
      gateway: `${process.env.NEXT_PUBLIC_PINATA_GATEWAY || "https://gateway.pinata.cloud"}/ipfs/${pinataData.IpfsHash}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
