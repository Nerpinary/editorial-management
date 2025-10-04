.PHONY: help install dev build start clean install-all server client

# Цвета для вывода
BLUE = \033[0;34m
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
NC = \033[0m # No Color

help: ## Показать справку по командам
	@echo "$(BLUE)Система управления нагрузкой редакций$(NC)"
	@echo ""
	@echo "$(GREEN)Доступные команды:$(NC)"
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  $(YELLOW)%-15s$(NC) %s\n", $$1, $$2}' $(MAKEFILE_LIST)

install: install-all ## Установить все зависимости (alias для install-all)

install-all: ## Установить зависимости для всех частей проекта
	@echo "$(BLUE)Установка зависимостей...$(NC)"
	@npm install
	@echo "$(GREEN)✓ Корневые зависимости установлены$(NC)"
	@cd server && npm install
	@echo "$(GREEN)✓ Зависимости сервера установлены$(NC)"
	@cd client && npm install
	@echo "$(GREEN)✓ Зависимости клиента установлены$(NC)"
	@echo "$(GREEN)🎉 Все зависимости успешно установлены!$(NC)"

dev: ## Запустить в режиме разработки (сервер + клиент)
	@echo "$(BLUE)Запуск в режиме разработки...$(NC)"
	@echo "$(YELLOW)Frontend: http://localhost:3000$(NC)"
	@echo "$(YELLOW)Backend:  http://localhost:3001$(NC)"
	@echo "$(YELLOW)Нажмите Ctrl+C для остановки$(NC)"
	@echo ""
	@npm run dev

run.dev: dev ## Алиас для dev команды

build: ## Собрать проект для продакшена
	@echo "$(BLUE)Сборка проекта...$(NC)"
	@cd client && npm run build
	@echo "$(GREEN)✓ Проект собран для продакшена$(NC)"

start: build ## Запустить продакшен версию
	@echo "$(BLUE)Запуск продакшен сервера...$(NC)"
	@echo "$(YELLOW)Приложение доступно по адресу: http://localhost:3001$(NC)"
	@cd server && npm start

server: ## Запустить только backend сервер
	@echo "$(BLUE)Запуск backend сервера...$(NC)"
	@echo "$(YELLOW)API доступно по адресу: http://localhost:3001$(NC)"
	@cd server && npm run dev

client: ## Запустить только frontend клиент
	@echo "$(BLUE)Запуск frontend клиента...$(NC)"
	@echo "$(YELLOW)Приложение доступно по адресу: http://localhost:3000$(NC)"
	@cd client && npm run dev

clean: ## Очистить node_modules и пересобрать
	@echo "$(BLUE)Очистка зависимостей...$(NC)"
	@rm -rf node_modules
	@rm -rf server/node_modules
	@rm -rf client/node_modules
	@rm -rf client/dist
	@rm -f server/database.sqlite
	@echo "$(GREEN)✓ Очистка завершена$(NC)"
	@echo "$(YELLOW)Запустите 'make install' для переустановки зависимостей$(NC)"

reset: clean install ## Полная переустановка (очистка + установка)

logs: ## Показать логи (если запущено в фоне)
	@echo "$(BLUE)Логи приложения:$(NC)"
	@tail -f server/logs/app.log 2>/dev/null || echo "$(YELLOW)Логи не найдены$(NC)"

status: ## Показать статус запущенных процессов
	@echo "$(BLUE)Статус процессов:$(NC)"
	@lsof -ti:3000,3001 2>/dev/null | while read pid; do \
		echo "$$(ps -p $$pid -o pid,command --no-headers 2>/dev/null)"; \
	done || echo "$(YELLOW)Процессы не запущены$(NC)"

stop: ## Остановить все процессы на портах 3000 и 3001
	@echo "$(BLUE)Остановка процессов...$(NC)"
	@lsof -ti:3000,3001 | xargs kill -9 2>/dev/null || echo "$(YELLOW)Процессы не найдены$(NC)"
	@echo "$(GREEN)✓ Процессы остановлены$(NC)"

# Проверка зависимостей
check-deps: ## Проверить установленные зависимости
	@echo "$(BLUE)Проверка зависимостей:$(NC)"
	@command -v node >/dev/null 2>&1 || { echo "$(RED)❌ Node.js не установлен$(NC)"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "$(RED)❌ npm не установлен$(NC)"; exit 1; }
	@echo "$(GREEN)✓ Node.js $(shell node --version)$(NC)"
	@echo "$(GREEN)✓ npm $(shell npm --version)$(NC)"

# Первый запуск
first-run: check-deps install dev ## Первый запуск (проверка + установка + запуск)

# Разработка
setup: first-run ## Полная настройка для разработки

# Резервное копирование
backup: ## Создать резервную копию базы данных
	@echo "$(BLUE)Создание резервной копии базы данных...$(NC)"
	@./backup-db.sh

backup-custom: ## Создать резервную копию с пользовательским именем (NAME=имя_файла)
	@echo "$(BLUE)Создание резервной копии с пользовательским именем...$(NC)"
	@echo "Использование: make backup-custom NAME=my_backup"
	@if [ -z "$(NAME)" ]; then \
		echo "$(RED)Ошибка: укажите имя файла NAME=имя_файла$(NC)"; \
		exit 1; \
	fi
	@./backup-db.sh $(NAME)

.DEFAULT_GOAL := help
