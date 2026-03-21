#!/usr/bin/env python3
"""
Stage 2a: TTS Audio Generation for Paper-Video

Reads script.json, generates audio for each scene using Edge-TTS,
and outputs enriched_script.json with audio metadata + word timestamps.

Usage:
    python scripts/generate_audio.py input/msa_script.json
    python scripts/generate_audio.py input/msa_script.json --voice zh-CN-YunxiNeural
    python scripts/generate_audio.py input/msa_script.json --output input/msa_enriched.json
"""
import json
import sys
import asyncio
import argparse
from pathlib import Path

try:
    import edge_tts
except ImportError:
    print("❌ edge-tts not installed. Run: pip install edge-tts")
    sys.exit(1)

PROJECT_ROOT = Path(__file__).parent.parent
AUDIO_DIR = PROJECT_ROOT / "assets" / "audio"


async def generate_scene_audio(
    scene_id: str, text: str, voice: str, output_path: Path
) -> dict | None:
    """Generate TTS audio for a single scene with word-level timestamps."""
    communicate = edge_tts.Communicate(text, voice)

    word_timestamps: list[dict] = []

    # Collect audio and boundary events
    audio_chunks: list[bytes] = []

    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_chunks.append(chunk["data"])
        elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
            # Edge-TTS uses 100ns units for offset/duration
            start_ms = int(chunk["offset"] / 10000)
            end_ms = int((chunk["offset"] + chunk["duration"]) / 10000)
            text = chunk["text"]

            if chunk["type"] == "SentenceBoundary":
                # Chinese TTS gives sentence-level boundaries.
                # Split by Chinese punctuation into natural clauses for caption display.
                import re
                clauses = re.split(r'([，。、；：！？,\.;:!\?])', text)
                # Merge punctuation back onto preceding clause
                merged: list[str] = []
                for part in clauses:
                    if not part:
                        continue
                    if re.match(r'^[，。、；：！？,\.;:!\?]$', part) and merged:
                        merged[-1] += part
                    else:
                        merged.append(part)
                # Remove empty/whitespace-only
                merged = [c.strip() for c in merged if c.strip()]

                if not merged:
                    merged = [text]

                total_dur = end_ms - start_ms
                # Distribute time proportionally by character count
                total_chars = sum(len(c) for c in merged)
                cur_offset = start_ms
                for clause in merged:
                    clause_dur = int(total_dur * len(clause) / max(total_chars, 1))
                    word_timestamps.append({
                        "word": clause,
                        "startMs": cur_offset,
                        "endMs": cur_offset + clause_dur,
                    })
                    cur_offset += clause_dur
            else:
                word_timestamps.append({
                    "word": text,
                    "startMs": start_ms,
                    "endMs": end_ms,
                })

    if not audio_chunks:
        return None

    # Write audio file
    with open(output_path, "wb") as f:
        for chunk in audio_chunks:
            f.write(chunk)

    if output_path.stat().st_size == 0:
        return None

    # Calculate duration from last word timestamp or file
    duration_ms = 0
    if word_timestamps:
        duration_ms = word_timestamps[-1]["endMs"] + 500  # Add 500ms padding

    # Also save timestamps as sidecar JSON
    ts_path = output_path.with_suffix(".timestamps.json")
    with open(ts_path, "w") as f:
        json.dump(word_timestamps, f, ensure_ascii=False, indent=2)

    return {
        "file": str(output_path.relative_to(PROJECT_ROOT)),
        "durationSeconds": round(duration_ms / 1000, 2),
        "wordTimestamps": word_timestamps,
    }


async def main():
    parser = argparse.ArgumentParser(description="Generate TTS audio for paper-video scenes")
    parser.add_argument("script", help="Path to script.json")
    parser.add_argument("--voice", default="zh-CN-YunxiNeural", help="TTS voice")
    parser.add_argument("--output", default=None, help="Output enriched script path")
    args = parser.parse_args()

    script_path = PROJECT_ROOT / args.script
    with open(script_path) as f:
        script = json.load(f)

    AUDIO_DIR.mkdir(parents=True, exist_ok=True)

    output_path = args.output
    if output_path is None:
        stem = script_path.stem
        output_path = script_path.parent / f"{stem}_enriched.json"
    else:
        output_path = PROJECT_ROOT / output_path

    scenes = script["scenes"]
    print(f"🎙  Generating audio for {len(scenes)} scenes...")

    for i, scene in enumerate(scenes):
        scene_id = scene["id"]
        narration = scene["narration"]
        audio_file = AUDIO_DIR / f"{scene_id}.mp3"

        print(f"  [{i+1}/{len(scenes)}] {scene_id}: {narration[:50]}...")

        audio_data = await generate_scene_audio(scene_id, narration, args.voice, audio_file)

        if audio_data:
            scene["audio"] = audio_data
            print(f"  ✅ {audio_data['durationSeconds']}s, {len(audio_data['wordTimestamps'])} word timestamps")
        else:
            print(f"  ⚠️  Audio generation failed for {scene_id}, using durationHint")

    # Write enriched script
    with open(output_path, "w") as f:
        json.dump(script, f, ensure_ascii=False, indent=2)

    total_duration = sum(
        s.get("audio", {}).get("durationSeconds", s.get("durationHint", 0))
        for s in scenes
    )
    print(f"\n✅ Enriched script saved to: {output_path}")
    print(f"📊 Total estimated duration: {total_duration:.1f}s ({total_duration/60:.1f}min)")


if __name__ == "__main__":
    asyncio.run(main())
