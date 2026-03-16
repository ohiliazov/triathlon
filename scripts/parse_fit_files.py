import json
import sys
from datetime import datetime
from pathlib import Path

from garmin_fit_sdk import Decoder, Stream


class DateTimeEncoder(json.JSONEncoder):
    """Custom JSON encoder for datetime objects."""

    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)


def parse_fit_files(source_dir, dest_root):
    """
    Recursively iterate over all .fit files in source_dir,
    parse them using garmin_fit_sdk, and store as JSONs in dest_root,
    grouped by garmin file type.
    """
    source_path = Path(source_dir)
    dest_path = Path(dest_root)

    # Ensure source exists
    if not source_path.exists():
        print(f"Error: Source directory '{source_dir}' does not exist.")
        return

    # Create destination root
    dest_path.mkdir(parents=True, exist_ok=True)

    # Find all .fit files recursively
    fit_files = list(source_path.rglob("*.fit"))
    print(f"Found {len(fit_files)} .fit files to process.")

    for fit_file in fit_files:
        try:
            print(f"Processing: {fit_file.relative_to(source_path)}")

            stream = Stream.from_file(str(fit_file))
            decoder = Decoder(stream)
            messages, errors = decoder.read()

            if errors:
                print(f"  - Warnings/Errors encountered: {errors}")

            # Determine file type
            # Standard FIT files have 'file_id_mesgs' with a 'type' field
            file_type = "unknown"
            if "file_id_mesgs" in messages and messages["file_id_mesgs"]:
                file_id = messages["file_id_mesgs"][0]
                file_type = file_id.get("type", "unknown")

            # Create subfolder for file type in destination
            type_dir = dest_path / str(file_type)
            type_dir.mkdir(parents=True, exist_ok=True)

            # Destination filename: maintain original name but change extension
            json_filename = fit_file.stem + ".json"
            json_path = type_dir / json_filename

            # Check for collisions if multiple files have the same name in different folders
            # We'll prepend the parent directory name if needed, or just append a suffix
            if json_path.exists():
                # For simplicity, we'll append the parent folder's name to avoid simple collisions
                parent_folder = fit_file.parent.name
                json_filename = f"{parent_folder}_{fit_file.stem}.json"
                json_path = type_dir / json_filename

            # Save as JSON
            with open(json_path, "w", encoding="utf-8") as f:
                json.dump(messages, f, cls=DateTimeEncoder, indent=2)

            print(f"  - Saved to: {json_path.relative_to(dest_path)}")

        except Exception as e:
            print(f"  - Error processing {fit_file}: {e}")


if __name__ == "__main__":
    SOURCE = "downloads/GARMIN"
    DEST = "downloads/GARMIN_JSONS"

    # Allow command line overrides
    if len(sys.argv) > 1:
        SOURCE = sys.argv[1]
    if len(sys.argv) > 2:
        DEST = sys.argv[2]

    parse_fit_files(SOURCE, DEST)
