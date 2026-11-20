IMAGE ?= packet-journey-3d
TAG   ?= $(shell git rev-parse --short HEAD)
CHART := deploy/helm/packet-journey

.PHONY: install dev lint typecheck test build ci docker-build docker-run up down helm-lint helm-template

install:        ## install dependencies
	npm ci
dev:            ## Vite dev server on :5173
	npm run dev
lint:
	npm run lint
typecheck:
	npm run typecheck
test:
	npm test
build:
	npm run build
ci: lint typecheck test build   ## everything CI runs before the image

docker-build:   ## build the production image
	docker build -t $(IMAGE):$(TAG) .
docker-run: docker-build   ## run it on http://localhost:8080
	docker run --rm -p 8080:8080 --read-only --tmpfs /tmp/nginx --tmpfs /var/cache/nginx $(IMAGE):$(TAG)
up:             ## docker compose up
	docker compose up --build -d
down:
	docker compose down

helm-lint:
	helm lint $(CHART)
helm-template:
	helm template packet-journey $(CHART)
