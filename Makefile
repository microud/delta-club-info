.PHONY: setup dev dev-server dev-admin db-up db-migrate db-seed db-generate db-reset down clean

# 首次搭建：启动数据库 + 安装依赖 + 迁移 + 创建初始管理员
setup: db-up
	pnpm install
	@echo "⏳ 等待 PostgreSQL 就绪..."
	@until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	pnpm db:migrate
	pnpm db:seed
	@echo "✅ 环境就绪，运行 make dev 启动开发服务"

# 启动所有开发服务（server + admin）
dev: db-up
	pnpm dev

# 单独启动后端
dev-server: db-up
	pnpm dev:server

# 单独启动前端
dev-admin:
	pnpm dev:admin

# 数据库
db-up:
	docker compose up -d

db-migrate:
	pnpm db:migrate

db-seed:
	pnpm db:seed

db-generate:
	pnpm db:generate

# 重置数据库（删除 volume 重建）
db-reset:
	docker compose down -v
	$(MAKE) db-up
	@echo "⏳ 等待 PostgreSQL 就绪..."
	@until docker compose exec -T postgres pg_isready -U postgres > /dev/null 2>&1; do sleep 1; done
	pnpm db:migrate
	pnpm db:seed

# 停止容器
down:
	docker compose down

# 停止容器并清除数据
clean:
	docker compose down -v
