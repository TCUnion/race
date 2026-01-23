import subprocess
import getpass
import sys

def run_command(command, input_data=None):
    try:
        process = subprocess.Popen(
            command,
            shell=True,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate(input=input_data)
        if process.returncode != 0:
            print(f"錯誤: {stderr}")
            return False
        return stdout
    except Exception as e:
        print(f"執行發生異常: {e}")
        return False

def main():
    print("=== Supabase 資料搬移工具 (Zeabur 版) ===")
    print("註: Zeabur 的 Postgres 通常需要使用 'TCP 域名' 與特定的 '埠號' (例如: xxx.clusters.zeabur.com:12345)")
    
    print("\n--- 來源端 (Source) ---")
    source_host = input("請輸入來源端 TCP 主機 (例如: xxx.clusters.zeabur.com): ").strip()
    source_port = input("請輸入來源端 埠號 (預設 5432): ").strip() or "5432"
    source_password = getpass.getpass("請輸入來源端 Postgres 密碼: ")
    
    print("\n--- 目標端 (Target) ---")
    target_host = input("請輸入目標端 TCP 主機: ").strip()
    target_port = input("請輸入目標端 埠號 (預設 5432): ").strip() or "5432"
    target_password = getpass.getpass("請輸入目標端 Postgres 密碼: ")
    
    sql_file = "migration_temp/full_dump.sql"
    subprocess.run(["mkdir", "-p", "migration_temp"])

    print("\n[1/2] 正在從來源端匯出資料...")
    export_cmd = f"PGPASSWORD='{source_password}' pg_dump -h {source_host} -U postgres -d postgres -p {source_port} --no-owner --no-privileges -f {sql_file}"
    
    if subprocess.run(export_cmd, shell=True).returncode == 0:
        print("✅ 匯出成功！")
    else:
        print("❌ 匯出失敗，請檢查主機位址、埠號與密碼。")
        sys.exit(1)

    print("\n[2/2] 正在將資料匯入至目標端...")
    import_cmd = f"PGPASSWORD='{target_password}' psql -h {target_host} -U postgres -d postgres -p {target_port} -f {sql_file}"
    
    if subprocess.run(import_cmd, shell=True).returncode == 0:
        print("\n🎉 遷移完成！")
    else:
        print("❌ 匯入失敗，請檢查目標端主機位址、埠號與密碼。")
        sys.exit(1)

if __name__ == "__main__":
    main()
