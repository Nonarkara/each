#!/usr/bin/env bash
set -euo pipefail

bench_dir=/home/frappe/bench-data/frappe-bench
site_name=${EACH_SITE_NAME:-each.localhost}
admin_password=${EACH_ADMIN_PASSWORD:-admin}
db_root_password=${EACH_DB_ROOT_PASSWORD:-each-local}

if [ "$(id -u)" = 0 ]; then
  mkdir -p /home/frappe/bench-data
  chown -R frappe:frappe /home/frappe/bench-data
  exec su --login \
    --whitelist-environment EACH_ADMIN_PASSWORD,EACH_DB_ROOT_PASSWORD,EACH_SITE_NAME \
    frappe -c 'bash /workspace/docker/init-frappe.sh'
fi

install_each_backend() {
  if [ ! -L "$bench_dir/apps/each_backend" ]; then
    ln -s /workspace/backend/each_backend "$bench_dir/apps/each_backend"
  fi
  "$bench_dir/env/bin/pip" install --quiet --editable /workspace/backend/each_backend
  if ! grep -qx each_backend "$bench_dir/sites/apps.txt"; then
    if [ -s "$bench_dir/sites/apps.txt" ] && [ -n "$(tail -c 1 "$bench_dir/sites/apps.txt")" ]; then
      printf '\n' >> "$bench_dir/sites/apps.txt"
    fi
    printf '%s\n' each_backend >> "$bench_dir/sites/apps.txt"
  fi
}

if [ ! -d "$bench_dir/apps/frappe" ]; then
  bench init \
    --frappe-branch version-15 \
    --skip-redis-config-generation \
    --skip-assets \
    "$bench_dir"

  cd "$bench_dir"
  bench set-mariadb-host mariadb
  bench set-redis-cache-host redis://redis:6379
  bench set-redis-queue-host redis://redis:6379
  bench set-redis-socketio-host redis://redis:6379

  # Redis is provided by Compose. Asset watch is unnecessary for the Python bridge app.
  sed -i '/redis/d' Procfile
  sed -i '/watch/d' Procfile

  bench get-app --branch version-15 --skip-assets erpnext
  install_each_backend

  bench new-site "$site_name" \
    --admin-password "$admin_password" \
    --db-root-password "$db_root_password" \
    --mariadb-user-host-login-scope='%'
  bench --site "$site_name" install-app erpnext
  bench --site "$site_name" install-app each_backend
else
  cd "$bench_dir"
  install_each_backend
  bench --site "$site_name" migrate
fi

bench --site "$site_name" set-config developer_mode 1
bench --site "$site_name" set-config mute_emails 1
bench --site "$site_name" set-config server_script_enabled 0
# Use authenticated session cookies plus X-Frappe-CSRF-Token for writes.
bench --site "$site_name" set-config ignore_csrf 0
bench --site "$site_name" set-config allow_cors '["http://each.localhost:5173","http://127.0.0.1:5173","http://localhost:5173"]' --parse
bench --site "$site_name" enable-scheduler
bench use "$site_name"
bench start
