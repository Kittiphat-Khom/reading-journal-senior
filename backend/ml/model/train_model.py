import pandas as pd
import numpy as np
import os
import sys
from sentence_transformers import SentenceTransformer

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "..", "data")
MODEL_DIR = os.path.join(BASE_DIR, "models")
BOOKS_PATH = os.path.join(DATA_DIR, "books.csv")

os.makedirs(MODEL_DIR, exist_ok=True)

def train():
    print(f"📘 Loading Book Data from: {BOOKS_PATH}")
    if not os.path.exists(BOOKS_PATH):
        print("❌ Error: books.csv not found. Please run fetch_data.js first.")
        sys.exit(1)

    try:
        books = pd.read_csv(BOOKS_PATH)

        if books.empty:
            print("⚠️ Warning: CSV is empty.")
            sys.exit(0)

        books['title'] = books['title'].astype(str).fillna('')
        books['authors'] = books['authors'].astype(str).fillna('Unknown')
        books['genres'] = books['genres'].astype(str).fillna('')
        books['description'] = books['description'].astype(str).fillna('')

        books["combined_text"] = (
            "Title: " + books["title"] + ". " +
            "Description: " + books["description"]
        )

        print("🧠 Loading SBERT Model (all-MiniLM-L6-v2)...")
        model = SentenceTransformer('all-MiniLM-L6-v2')

        print(f"🔧 Encoding {len(books)} books to vectors...")
        embeddings = model.encode(
            books["combined_text"].tolist(),
            show_progress_bar=True,
            batch_size=64
        )
        embeddings = embeddings.astype(np.float32)

        print("💾 Saving model artifacts...")
        # Save embeddings (~15MB for 10K books) — commitable to git
        np.save(os.path.join(MODEL_DIR, "embeddings.npy"), embeddings)

        # Save book metadata as CSV (portable across pandas versions)
        meta_cols = ["book_id", "title", "image_url", "authors", "genres", "description", "rating"]
        save_cols = [c for c in meta_cols if c in books.columns]
        books[save_cols].to_csv(os.path.join(MODEL_DIR, "book_index.csv"), index=False)

        print(f"✅ Training Complete! embeddings={embeddings.shape}, saved at: {MODEL_DIR}")

    except Exception as e:
        print(f"❌ Critical Error during training: {e}")
        sys.exit(1)

if __name__ == "__main__":
    train()
