#!/bin/bash

# Скрипт для создания резервной копии базы данных
# Использование: ./backup-db.sh [имя_файла]

# Получаем текущую дату и время
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="backups"

# Создаем директорию для бэкапов если её нет
mkdir -p "$BACKUP_DIR"

# Определяем имя файла бэкапа
if [ $# -eq 0 ]; then
    BACKUP_NAME="database_backup_$TIMESTAMP.sqlite"
else
    BACKUP_NAME="$1"
fi

BACKUP_PATH="$BACKUP_DIR/$BACKUP_NAME"

# Копируем базу данных
cp server/database.sqlite "$BACKUP_PATH"

# Создаем SQL дамп
SQL_DUMP_PATH="$BACKUP_DIR/database_dump_$TIMESTAMP.sql"
sqlite3 server/database.sqlite .dump > "$SQL_DUMP_PATH"

echo "✅ Резервная копия создана:"
echo "   📁 База данных: $BACKUP_PATH"
echo "   📄 SQL дамп: $SQL_DUMP_PATH"
echo ""
echo "📊 Размер файлов:"
ls -lh "$BACKUP_PATH" "$SQL_DUMP_PATH"

# Создаем README с информацией о бэкапе
cat > "$BACKUP_DIR/README_$TIMESTAMP.txt" << EOF
Резервная копия базы данных
============================

Дата создания: $(date)
Исходная база: server/database.sqlite

Файлы:
- $BACKUP_NAME - полная копия SQLite базы данных
- database_dump_$TIMESTAMP.sql - SQL дамп для восстановления

Для восстановления:
1. Остановите сервер: make stop
2. Замените базу: cp $BACKUP_NAME server/database.sqlite
3. Запустите сервер: make dev

Или восстановите из SQL дампа:
sqlite3 server/database.sqlite < database_dump_$TIMESTAMP.sql
EOF

echo ""
echo "📝 Создан README: $BACKUP_DIR/README_$TIMESTAMP.txt"
