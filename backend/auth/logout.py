import argparse
import json
from pathlib import Path
from datetime import datetime

def logout() -> dict:
    """
    Logout endpoint for stateless JWT authentication.
    Since JWT is stateless, we just return a success message.
    Token invalidation is handled client-side by removing the token.
    """
    return {
        "message": "Logged out successfully",
        "timestamp": datetime.now().isoformat()
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="User logout endpoint")
    args = parser.parse_args()

    result = logout()

    # Save to output folder
    output_dir = Path(__file__).parent / "output"
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"logout_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    output_file.write_text(json.dumps(result, ensure_ascii=False, indent=2))
    print(f"Saved: {output_file}")
    print(json.dumps(result, ensure_ascii=False, indent=2))
