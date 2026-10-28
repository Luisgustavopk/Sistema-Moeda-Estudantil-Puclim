#!/usr/bin/env bash
set -euo pipefail

project_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$project_root"

ensure_env() {
  if [[ ! -f .env ]]; then
    command -v openssl >/dev/null || { echo 'Instale openssl para gerar as senhas locais ou prepare .env a partir de .env.example.' >&2; exit 1; }
    local user_password root_password
    user_password=$(openssl rand -hex 32)
    root_password=$(openssl rand -hex 32)
    # O arquivo é criado sem sobrescrever configurações anteriores e sem exibir senhas.
    (umask 077; sed -e "s/change-me-local-user/$user_password/" -e "s/change-me-local-root/$root_password/" .env.example > .env)
    echo 'Arquivo .env criado com senhas aleatórias. Ele é ignorado pelo Git.'
  fi
}

load_env() {
  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line=${line%$'\r'}
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    [[ "$line" =~ ^([A-Z][A-Z0-9_]*)=(.*)$ ]] || { echo 'Use .env com uma variável NOME=valor por linha, sem aspas.' >&2; exit 1; }
    key=${BASH_REMATCH[1]}; value=${BASH_REMATCH[2]}
    # Não executa source/eval: valores são dados. O arquivo compartilhado prevalece
    # nos scripts para evitar senhas divergentes herdadas de outro terminal.
    case "$key" in
      DB_*|MYSQL_ROOT_PASSWORD|SMTP_*|MAIL_*|SESSION_*|UPLOAD_DIRECTORY|SEMESTER_ZONE|SERVER_PORT)
        export "$key=$value" ;;
    esac
  done < .env
  case "$(uname -s)" in
    Linux*) default_engine=mariadb ;;
    MINGW*|MSYS*|CYGWIN*|Darwin*) default_engine=mysql ;;
    *) echo 'Sistema não reconhecido. Defina DB_ENGINE=mysql ou DB_ENGINE=mariadb.' >&2; default_engine=mysql ;;
  esac
  export DB_ENGINE=${DB_ENGINE:-$default_engine}
  [[ "$DB_ENGINE" == mysql || "$DB_ENGINE" == mariadb ]] || { echo 'DB_ENGINE deve ser mysql ou mariadb.' >&2; exit 1; }
  export DB_NAME=${DB_NAME:-puclim} DB_USER=${DB_USER:-puclim} DB_PORT=${DB_PORT:-3307}
  [[ -n "${DB_PASSWORD:-}" && -n "${MYSQL_ROOT_PASSWORD:-}" ]] || { echo 'Preencha DB_PASSWORD e MYSQL_ROOT_PASSWORD em .env.' >&2; exit 1; }
}

compose() {
  command -v docker >/dev/null || { echo 'Docker não está instalado. Instale Docker Engine e o plugin Docker Compose para iniciar os containers.' >&2; exit 1; }
  docker compose version >/dev/null
  docker compose --env-file "$project_root/.env" --file "$project_root/compose.yaml" --profile "$DB_ENGINE" "$@"
}

action=${1:-up}
case "$action" in
  up|backend|down|logs|config|init) ;;
  *) echo 'Uso: bash scripts/dev.sh [up|backend|down|logs|config|init]' >&2; exit 2 ;;
esac
ensure_env
load_env
case "$action" in
  init) echo "Configuração pronta: $DB_ENGINE em 127.0.0.1:$DB_PORT." ;;
  up)
    echo "Iniciando $DB_ENGINE e Mailpit. Banco: 127.0.0.1:$DB_PORT."
    compose up --detach --wait --wait-timeout 180 "$DB_ENGINE" mailpit
    echo 'Banco pronto. Em outro terminal, execute: bash scripts/dev.sh backend' ;;
  backend)
    # O script conecta ao container selecionado. Para um banco externo, use DB_URL com mvnw diretamente.
    export DB_URL="jdbc:$DB_ENGINE://127.0.0.1:$DB_PORT/$DB_NAME?connectionTimeZone=UTC"
    echo "Backend usando $DB_ENGINE em 127.0.0.1:$DB_PORT."
    cd backend
    exec bash ./mvnw spring-boot:run ;;
  down) compose down ;;
  logs) compose logs --follow "$DB_ENGINE" ;;
  config) compose config --quiet; echo "Compose válido para o perfil $DB_ENGINE." ;;
esac
