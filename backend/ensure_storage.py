from database import supabase
import sys

def ensure_bucket():
    bucket_name = "race-previews"
    try:
        # 嘗試取得 bucket
        res = supabase.storage.get_bucket(bucket_name)
        print(f"Bucket '{bucket_name}' already exists.")
    except Exception as e:
        print(f"Bucket '{bucket_name}' not found, attempting to create...")
        try:
            # 建立公開 bucket
            supabase.storage.create_bucket(bucket_name, options={"public": True})
            print(f"Successfully created public bucket '{bucket_name}'")
        except Exception as create_err:
            print(f"Failed to create bucket: {create_err}")
            print("Please manually create a public bucket named 'race-previews' in Supabase Storage.")

if __name__ == "__main__":
    ensure_bucket()
