import asyncio
import os
import sys
import traceback


async def main():
    from app.services.image_service import run_model

    # If a path is passed as an argument, use that directly.
    if len(sys.argv) > 1:
        path = os.path.abspath(sys.argv[1])
        if not os.path.isfile(path):
            raise SystemExit(f"Provided path does not exist or is not a file: {path}")
    else:
        # Fallback: use the most recent file in ./uploads
        uploads_dir = os.path.abspath("uploads")
        files = []
        if os.path.isdir(uploads_dir):
            for name in os.listdir(uploads_dir):
                p = os.path.join(uploads_dir, name)
                if os.path.isfile(p):
                    files.append((os.path.getmtime(p), p))
        files.sort(reverse=True)
        if not files:
            raise SystemExit(f"No files found in {uploads_dir} and no path argument provided.")
        path = files[0][1]

    print("Using file:", path)
    with open(path, "rb") as f:
        content = f.read()

    chunks, elapsed = await run_model(content, path)
    print("Elapsed:", elapsed)
    print("Chunks:", len(chunks))
    if chunks:
        print("First chunk:", chunks[0].model_dump())


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        traceback.print_exc()
        raise

