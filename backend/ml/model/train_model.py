import pandas as pd
import numpy as np
import os
import pickle
import sys
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# Paths setup
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
        # Read CSV
        books = pd.read_csv(BOOKS_PATH)
        
        if books.empty:
            print("⚠️ Warning: CSV is empty.")
            sys.exit(0)

        # Clean Data & Fill Missing Values
        books['title'] = books['title'].astype(str).fillna('')
        books['authors'] = books['authors'].astype(str).fillna('Unknown')
        books['genres'] = books['genres'].astype(str).fillna('')
        books['description'] = books['description'].astype(str).fillna('')
        
        # ----------------------------------------------------
        # 🧠 STEP 1: Semantic Representation
        # Theory: Separation of Concerns (แยกตัวแปรให้ชัดเจน)
        # เราจะให้ SBERT เรียนรู้เฉพาะ "เนื้อหา" (Title + Description) เท่านั้น
        # ส่วน Author และ Genre เราแยกไปคิดคะแนนต่างหากแล้วใน recommend_auto.py
        # ----------------------------------------------------
        books["combined_text"] = (
            "Title: " + books["title"] + ". " +
            "Description: " + books["description"]
        )
        
        print("🧠 Loading SBERT Model (all-MiniLM-L6-v2)...")
        # Model: all-MiniLM-L6-v2 (Optimized for Semantic Similarity)
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        print(f"🔧 Encoding {len(books)} books to vectors...")
        # Transforming text to 384-dimensional dense vectors
        embeddings = model.encode(books["combined_text"].tolist(), show_progress_bar=True, batch_size=64)

        # ----------------------------------------------------
        # 📐 STEP 2: Similarity Calculation
        # Theory: Vector Space Model & Cosine Similarity
        # ----------------------------------------------------
        print("🔢 Computing Cosine Similarity...")
        cosine_sim = cosine_similarity(embeddings).astype(np.float32)
        
        print("💾 Saving .pkl Models...")
        # 1. Save Similarity Matrix
        with open(os.path.join(MODEL_DIR, "cosine_sim.pkl"), "wb") as f:
            pickle.dump(cosine_sim, f)
            
        # 2. Save Book Metadata (for lookup)
        meta_cols = ["book_id", "title", "image_url", "authors", "genres", "description"]
        save_cols = [c for c in meta_cols if c in books.columns]
        books[save_cols].to_pickle(os.path.join(MODEL_DIR, "book_index.pkl"))
        
        print(f"✅ Training Complete! Models saved at: {MODEL_DIR}")

    except Exception as e:
        print(f"❌ Critical Error during training: {e}")
        sys.exit(1)

if __name__ == "__main__":
    train()