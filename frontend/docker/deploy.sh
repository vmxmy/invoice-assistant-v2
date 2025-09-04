#!/bin/bash

# Docker deployment script for Invoice Assistant Frontend
set -e

# Configuration
BASE_COMPOSE_FILE="docker/docker-compose.yml"
PROJECT_NAME="invoice-assistant"
ENV_FILE=${ENV_FILE:-.env}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[DEPLOY]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_requirements() {
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
    fi
    
    if [ ! -f "$COMPOSE_FILE" ]; then
        error "Docker Compose file not found: $COMPOSE_FILE"
    fi
    
    if [ ! -f "$ENV_FILE" ]; then
        error "Environment file not found: $ENV_FILE"
    fi
}

validate_env() {
    log "Validating environment variables..."
    
    # Required environment variables
    required_vars=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_ANON_KEY"
        "DB_URL"
    )
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        error "Missing required environment variables: ${missing_vars[*]}"
    fi
    
    log "Environment validation passed"
}

# Deployment functions
deploy_dev() {
    log "Deploying development environment..."
    
    docker-compose -f $COMPOSE_FILE -p "${PROJECT_NAME}-dev" \
        --env-file $ENV_FILE \
        up -d --build
    
    log "Development deployment completed"
    show_status
}

deploy_staging() {
    log "Deploying staging environment..."
    
    # Build first
    docker-compose -f $COMPOSE_FILE -p "${PROJECT_NAME}-staging" \
        --env-file $ENV_FILE \
        build
    
    # Deploy with health check
    docker-compose -f $COMPOSE_FILE -p "${PROJECT_NAME}-staging" \
        --env-file $ENV_FILE \
        up -d
    
    log "Staging deployment completed"
    wait_for_health
    show_status
}

deploy_production() {
    log "Deploying production environment..."
    
    warn "This will deploy to production. Make sure you have:"
    warn "1. Tested the application thoroughly"
    warn "2. Reviewed all environment variables"
    warn "3. Made database backups if necessary"
    
    read -p "Continue with production deployment? (y/N): " -n 1 -r
    echo
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log "Production deployment cancelled"
        exit 0
    fi
    
    # Build with production optimizations
    docker-compose -f $COMPOSE_FILE -p "${PROJECT_NAME}-prod" \
        --env-file $ENV_FILE \
        build --no-cache
    
    # Rolling deployment (stop old, start new)
    docker-compose -f $COMPOSE_FILE -p "${PROJECT_NAME}-prod" \
        --env-file $ENV_FILE \
        up -d --force-recreate
    
    log "Production deployment completed"
    wait_for_health
    show_status
}

wait_for_health() {
    log "Waiting for application to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose -f $COMPOSE_FILE -p "${PROJECT_NAME}-${ENVIRONMENT}" ps | grep -q "healthy"; then
            log "Application is healthy!"
            return 0
        fi
        
        info "Health check attempt $attempt/$max_attempts..."
        sleep 10
        ((attempt++))
    done
    
    error "Application failed health check after $max_attempts attempts"
}

show_status() {
    log "Current deployment status:"
    docker-compose -f $COMPOSE_FILE -p "${PROJECT_NAME}-${ENVIRONMENT}" ps
    
    info "Application logs (last 20 lines):"
    docker-compose -f $COMPOSE_FILE -p "${PROJECT_NAME}-${ENVIRONMENT}" logs --tail=20 frontend
}

show_logs() {
    local lines=${1:-50}
    info "Showing last $lines lines of logs:"
    docker-compose -f $COMPOSE_FILE -p "${PROJECT_NAME}-${ENVIRONMENT}" logs --tail=$lines -f frontend
}

stop_deployment() {
    log "Stopping deployment..."
    docker-compose -f $COMPOSE_FILE -p "${PROJECT_NAME}-${ENVIRONMENT}" down
    log "Deployment stopped"
}

cleanup() {
    log "Cleaning up unused Docker resources..."
    docker system prune -f
    log "Cleanup completed"
}

backup_db() {
    if [ -n "$DB_URL" ]; then
        log "Creating database backup..."
        local backup_file="backup_$(date +%Y%m%d_%H%M%S).sql"
        pg_dump "$DB_URL" > "backups/$backup_file"
        log "Database backup created: $backup_file"
    else
        warn "DB_URL not set, skipping database backup"
    fi
}

# Main function
main() {
    case $ENVIRONMENT in
        local|dev|development)
            export BUILD_MODE=local
            deploy_dev
            ;;
        staging)
            export BUILD_MODE=staging
            deploy_staging
            ;;
        prod|production)
            export BUILD_MODE=production
            deploy_production
            ;;
        *)
            error "Unknown environment: $ENVIRONMENT. Use: local, staging, or production"
            ;;
    esac
}

# Help function
show_help() {
    cat << EOF
Invoice Assistant Frontend Docker Deployment Script

Usage: $0 [OPTIONS] COMMAND [ARGS]

Commands:
    deploy ENVIRONMENT     Deploy to specified environment (local|staging|production)
    logs [LINES]          Show application logs (default: 50 lines)
    status               Show deployment status
    stop                 Stop the deployment
    cleanup              Clean up unused Docker resources
    backup               Create database backup (if DB_URL is set)

Options:
    -f, --file FILE      Docker Compose file [default: docker/docker-compose.yml]
    -e, --env-file FILE  Environment file [default: .env]
    -p, --project NAME   Project name [default: invoice-assistant]
    -h, --help          Show this help message

Examples:
    $0 deploy local                    # Deploy to local development
    $0 deploy staging                  # Deploy to staging
    $0 deploy production               # Deploy to production
    $0 logs 100                       # Show last 100 lines of logs
    $0 status                         # Show current status
    $0 stop                           # Stop current deployment
    $0 cleanup                        # Clean up Docker resources

Environment Variables:
    ENV_FILE              Environment file path override
    PROJECT_NAME         Docker Compose project name override
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        deploy)
            COMMAND="deploy"
            ENVIRONMENT="$2"
            shift 2
            ;;
        logs)
            COMMAND="logs"
            LOG_LINES="$2"
            shift 1
            if [[ "$2" =~ ^[0-9]+$ ]]; then
                shift 1
            fi
            ;;
        status)
            COMMAND="status"
            shift 1
            ;;
        stop)
            COMMAND="stop"
            shift 1
            ;;
        cleanup)
            COMMAND="cleanup"
            shift 1
            ;;
        backup)
            COMMAND="backup"
            shift 1
            ;;
        -f|--file)
            COMPOSE_FILE="$2"
            shift 2
            ;;
        -e|--env-file)
            ENV_FILE="$2"
            shift 2
            ;;
        -p|--project)
            PROJECT_NAME="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            error "Unknown option: $1. Use -h for help."
            ;;
    esac
done

# Check requirements
check_requirements

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    log "Loading environment from: $ENV_FILE"
    export $(grep -v '^#' $ENV_FILE | xargs)
fi

# Execute command
case $COMMAND in
    deploy)
        if [ -z "$ENVIRONMENT" ]; then
            error "Environment not specified. Use: local, staging, or production"
        fi
        validate_env
        main
        ;;
    logs)
        show_logs ${LOG_LINES:-50}
        ;;
    status)
        show_status
        ;;
    stop)
        stop_deployment
        ;;
    cleanup)
        cleanup
        ;;
    backup)
        backup_db
        ;;
    *)
        error "No command specified. Use -h for help."
        ;;
esac