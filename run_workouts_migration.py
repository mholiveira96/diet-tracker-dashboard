import os
import sys
from libsql_client import create_client_sync
from dotenv import load_dotenv

# Load credentials from diet-tracker .env
load_dotenv('/home/clawd/.openclaw/workspace/skills/diet-tracker/.env')

TURSO_URL = os.getenv("TURSO_URL")
TURSO_AUTH_TOKEN = os.getenv("TURSO_AUTH_TOKEN")

if not TURSO_URL or not TURSO_AUTH_TOKEN:
    print("Erro: TURSO_URL e TURSO_AUTH_TOKEN não encontrados")
    sys.exit(1)

# SQL simplificado - apenas criar a tabela sem triggers/índices extras
sql = """
CREATE TABLE IF NOT EXISTS workouts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  modality TEXT,
  duration_min INTEGER,
  calories INTEGER,
  logged_at TEXT DEFAULT (datetime('now', '-3 hours'))
);
"""

# Conectar e executar
client = create_client_sync(TURSO_URL, auth_token=TURSO_AUTH_TOKEN)

print(f"Conectando a {TURSO_URL}...")
try:
    print("Executando CREATE TABLE workouts...")
    result = client.execute(sql)
    print(f"✅ Tabela workouts criada com sucesso!")
    print(f"\nAgora a API /api/data vai parar de retornar 500.")
    print(f"O front vai carregar a seção 'Treinos do Dia' corretamente.")

except Exception as e:
    print(f"\n❌ Erro na migração: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
finally:
    client.close()
