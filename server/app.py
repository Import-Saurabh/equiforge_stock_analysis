# server/app.py

from server import create_app  # ✅ Correct

# Create the Flask app using the factory pattern
app = create_app()

if __name__ == "__main__":
    print("🚀 Starting Flask development server...")
    app.run(port=5000, debug=True)
