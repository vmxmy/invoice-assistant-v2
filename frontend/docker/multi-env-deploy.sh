#!/bin/bash

# Multi-environment Docker deployment script for Invoice Assistant Frontend
set -e

# Configuration
PROJECT_NAME="invoice-assistant"
DEFAULT_ENV="local"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
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

success() {
    echo -e "${PURPLE}[SUCCESS]${NC} $1"
}

# Environment configuration
get_compose_files() {
    local env=$1
    case $env in
        local|dev)
            echo "-f docker/docker-compose.yml -f docker/docker-compose.local.yml"
            ;;
        staging|stage)
            echo "-f docker/docker-compose.yml -f docker/docker-compose.staging.yml"
            ;;
        production|prod)
            echo "-f docker/docker-compose.yml -f docker/docker-compose.production.yml"
            ;;
        *)
            error "Unknown environment: $env. Use: local, staging, or production"
            ;;
    esac
}

get_env_file() {
    local env=$1
    case $env in
        local|dev)
            echo ".env.local"
            ;;
        staging|stage)
            echo ".env.staging"
            ;;
        production|prod)
            echo ".env"
            ;;
        *)
            echo ".env"
            ;;
    esac
}

get_project_suffix() {
    local env=$1
    case $env in
        local|dev)
            echo "dev"
            ;;
        staging|stage)
            echo "staging"
            ;;
        production|prod)
            echo "prod"
            ;;
        *)
            echo "unknown"
            ;;
    esac
}

check_requirements() {
    local compose_files=$1
    local env_file=$2
    
    if ! command -v docker &> /dev/null; then
        error "Docker is not installed or not in PATH"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose is not installed or not in PATH"
    fi
    
    # Check compose files exist
    for file in $(echo $compose_files | grep -o 'docker/[^[:space:]]*'); do
        if [ ! -f "$file" ]; then
            error "Docker Compose file not found: $file"
        fi
    done
    
    if [ ! -f "$env_file" ]; then
        warn "Environment file not found: $env_file"
        warn "Using default .env file or environment variables"
    fi
}

validate_env() {
    local env=$1
    log "Validating environment variables for $env..."
    
    # Required environment variables
    required_vars=(
        "VITE_SUPABASE_URL"
        "VITE_SUPABASE_ANON_KEY"
    )
    
    # Environment-specific required vars
    case $env in
        production|prod)
            required_vars+=("DB_URL")
            ;;
    esac
    
    missing_vars=()
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            missing_vars+=("$var")
        fi
    done
    
    if [ ${#missing_vars[@]} -gt 0 ]; then
        error "Missing required environment variables for $env: ${missing_vars[*]}"
    fi
    
    success "Environment validation passed for $env"
}

# Deployment functions
deploy_environment() {
    local env=$1
    local compose_files=$(get_compose_files $env)
    local env_file=$(get_env_file $env)
    local project_suffix=$(get_project_suffix $env)
    local full_project_name="${PROJECT_NAME}-${project_suffix}"
    
    log "Deploying to $env environment..."
    info "Compose files: $compose_files"
    info "Environment file: $env_file"
    info "Project name: $full_project_name"
    
    # Load environment variables
    if [ -f "$env_file" ]; then
        log "Loading environment from: $env_file"
        export $(grep -v '^#' $env_file | xargs)
    fi
    
    # Validate environment
    validate_env $env
    
    # Deploy strategy based on environment
    case $env in
        local|dev)
            deploy_local $compose_files $full_project_name
            ;;
        staging|stage)
            deploy_staging $compose_files $full_project_name
            ;;
        production|prod)
            deploy_production $compose_files $full_project_name
            ;;
    esac
    
    success "$env deployment completed successfully!"
    show_status $compose_files $full_project_name
}

deploy_local() {
    local compose_files=$1
    local project_name=$2
    
    log "Starting local development environment..."
    
    docker-compose $compose_files -p $project_name \
        up -d --build --remove-orphans
    
    info "Local development environment is ready!"
    info "Frontend: http://localhost:${PORT:-3002}"
}

deploy_staging() {
    local compose_files=$1
    local project_name=$2
    
    log "Deploying to staging environment..."
    
    # Build first
    docker-compose $compose_files -p $project_name \
        build --parallel
    
    # Deploy with health check
    docker-compose $compose_files -p $project_name \
        up -d --remove-orphans
    
    log "Staging deployment completed"
    wait_for_health $compose_files $project_name "staging"
}

deploy_production() {
    local compose_files=$1
    local project_name=$2
    
    log "Deploying to production environment..."
    
    warn "This will deploy to production. Make sure you have:"
    warn "1. Tested the application thoroughly"
    warn "2. Reviewed all environment variables"
    warn "3. Made database backups if necessary"
    
    if [ "${FORCE_DEPLOY}" != "true" ]; then
        read -p "Continue with production deployment? (y/N): " -n 1 -r
        echo
        
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            log "Production deployment cancelled"
            exit 0
        fi
    fi
    
    # Create backup (if applicable)
    backup_current_deployment $compose_files $project_name
    
    # Build with production optimizations
    docker-compose $compose_files -p $project_name \
        build --no-cache --parallel
    
    # Rolling deployment
    docker-compose $compose_files -p $project_name \
        up -d --force-recreate --remove-orphans
    
    log "Production deployment completed"
    wait_for_health $compose_files $project_name "production"
}

wait_for_health() {
    local compose_files=$1
    local project_name=$2
    local env=$3
    
    log "Waiting for $env application to be healthy..."
    
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose $compose_files -p $project_name ps | grep -q "healthy"; then
            success "Application is healthy!"
            return 0
        fi
        
        info "Health check attempt $attempt/$max_attempts..."
        sleep 10
        ((attempt++))
    done
    
    error "Application failed health check after $max_attempts attempts"
}

show_status() {
    local compose_files=$1
    local project_name=$2
    
    log "Current deployment status:"
    docker-compose $compose_files -p $project_name ps
    
    info "Service URLs:"
    local frontend_port=$(docker-compose $compose_files -p $project_name port frontend 8080 2>/dev/null || echo "Not available")
    if [ "$frontend_port" != "Not available" ]; then
        info "Frontend: http://localhost:${frontend_port#*:}"
    fi
}

show_logs() {
    local env=$1
    local lines=${2:-50}
    local compose_files=$(get_compose_files $env)
    local project_suffix=$(get_project_suffix $env)
    local full_project_name="${PROJECT_NAME}-${project_suffix}"
    
    info "Showing last $lines lines of logs for $env:"
    docker-compose $compose_files -p $full_project_name logs --tail=$lines -f frontend
}

stop_deployment() {
    local env=$1
    local compose_files=$(get_compose_files $env)
    local project_suffix=$(get_project_suffix $env)
    local full_project_name="${PROJECT_NAME}-${project_suffix}"
    
    log "Stopping $env deployment..."
    docker-compose $compose_files -p $full_project_name down --remove-orphans
    success "$env deployment stopped"
}

cleanup_environment() {
    local env=$1
    
    log "Cleaning up $env environment..."
    stop_deployment $env
    
    # Remove unused images for this environment
    docker images --filter "label=environment=$env" -q | xargs -r docker rmi
    
    success "Cleanup completed for $env"
}

backup_current_deployment() {
    local compose_files=$1
    local project_name=$2
    
    log "Creating backup of current deployment..."
    
    # Export current images
    local backup_dir="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$backup_dir"
    
    # Get current image ID
    local current_image=$(docker-compose $compose_files -p $project_name images -q frontend)
    if [ -n "$current_image" ]; then
        docker save "$current_image" > "$backup_dir/frontend-backup.tar"
        log "Backup created: $backup_dir/frontend-backup.tar"
    fi
}

list_environments() {
    log "Available environments:"
    info "- local    : Local development with hot reload"
    info "- staging  : Testing environment with monitoring"
    info "- production : Production environment with full security"
}

# Health and monitoring functions
monitor_environment() {
    local env=$1
    local compose_files=$(get_compose_files $env)
    local project_suffix=$(get_project_suffix $env)
    local full_project_name="${PROJECT_NAME}-${project_suffix}"
    
    info "Monitoring $env environment..."
    
    # Show resource usage
    docker-compose $compose_files -p $full_project_name top
    
    # Show recent logs
    echo ""
    info "Recent logs (last 10 lines):"
    docker-compose $compose_files -p $full_project_name logs --tail=10 frontend
}

# Main function
main() {
    local env=$1
    
    if [ -z "$env" ]; then
        error "Environment not specified"
    fi
    
    local compose_files=$(get_compose_files $env)
    local env_file=$(get_env_file $env)
    
    check_requirements "$compose_files" "$env_file"
    deploy_environment $env
}

# Help function
show_help() {
    cat << EOF
Multi-Environment Docker Deployment Script for Invoice Assistant Frontend

Usage: $0 [OPTIONS] COMMAND [ARGS]

Commands:
    deploy ENVIRONMENT    Deploy to specified environment (local|staging|production)
    logs ENVIRONMENT [LINES]   Show application logs (default: 50 lines)
    status ENVIRONMENT    Show deployment status
    stop ENVIRONMENT     Stop the deployment
    cleanup ENVIRONMENT  Clean up environment resources
    monitor ENVIRONMENT  Monitor environment resources and logs
    list                 List available environments
    backup ENVIRONMENT   Create backup of current deployment

Environments:
    local       Local development environment (port 3002)
    staging     Testing environment (port 3001)  
    production  Production environment (port 3000)

Options:
    --force              Skip confirmation prompts (use with caution)
    -h, --help          Show this help message

Examples:
    $0 deploy local                    # Deploy to local development
    $0 deploy staging                  # Deploy to staging
    $0 deploy production               # Deploy to production
    $0 logs staging 100               # Show last 100 lines of staging logs
    $0 status production              # Show production status
    $0 stop local                     # Stop local deployment
    $0 cleanup staging                # Clean up staging resources
    $0 monitor production             # Monitor production environment

Environment Variables:
    FORCE_DEPLOY=true    Skip deployment confirmations
    PROJECT_NAME         Override project name (default: invoice-assistant)

Environment Files:
    .env.local          Local development configuration
    .env.staging        Staging configuration
    .env                Production configuration
EOF
}

# Parse command line arguments
FORCE_DEPLOY=false

while [[ $# -gt 0 ]]; do
    case $1 in
        deploy)
            COMMAND="deploy"
            ENVIRONMENT="$2"
            shift 2
            ;;
        logs)
            COMMAND="logs"
            ENVIRONMENT="$2"
            LOG_LINES="$3"
            shift 2
            if [[ "$1" =~ ^[0-9]+$ ]]; then
                shift 1
            fi
            ;;
        status)
            COMMAND="status"
            ENVIRONMENT="$2"
            shift 2
            ;;
        stop)
            COMMAND="stop"
            ENVIRONMENT="$2"
            shift 2
            ;;
        cleanup)
            COMMAND="cleanup"
            ENVIRONMENT="$2"
            shift 2
            ;;
        monitor)
            COMMAND="monitor"
            ENVIRONMENT="$2"
            shift 2
            ;;
        list)
            COMMAND="list"
            shift 1
            ;;
        backup)
            COMMAND="backup"
            ENVIRONMENT="$2"
            shift 2
            ;;
        --force)
            FORCE_DEPLOY=true
            shift 1
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

# Execute command
case $COMMAND in
    deploy)
        if [ -z "$ENVIRONMENT" ]; then
            error "Environment not specified for deploy command"
        fi
        main $ENVIRONMENT
        ;;
    logs)
        if [ -z "$ENVIRONMENT" ]; then
            error "Environment not specified for logs command"
        fi
        show_logs $ENVIRONMENT ${LOG_LINES:-50}
        ;;
    status)
        if [ -z "$ENVIRONMENT" ]; then
            error "Environment not specified for status command"
        fi
        compose_files=$(get_compose_files $ENVIRONMENT)
        project_suffix=$(get_project_suffix $ENVIRONMENT)
        full_project_name="${PROJECT_NAME}-${project_suffix}"
        show_status "$compose_files" "$full_project_name"
        ;;
    stop)
        if [ -z "$ENVIRONMENT" ]; then
            error "Environment not specified for stop command"
        fi
        stop_deployment $ENVIRONMENT
        ;;
    cleanup)
        if [ -z "$ENVIRONMENT" ]; then
            error "Environment not specified for cleanup command"
        fi
        cleanup_environment $ENVIRONMENT
        ;;
    monitor)
        if [ -z "$ENVIRONMENT" ]; then
            error "Environment not specified for monitor command"
        fi
        monitor_environment $ENVIRONMENT
        ;;
    list)
        list_environments
        ;;
    backup)
        if [ -z "$ENVIRONMENT" ]; then
            error "Environment not specified for backup command"
        fi
        compose_files=$(get_compose_files $ENVIRONMENT)
        project_suffix=$(get_project_suffix $ENVIRONMENT)
        full_project_name="${PROJECT_NAME}-${project_suffix}"
        backup_current_deployment "$compose_files" "$full_project_name"
        ;;
    *)
        error "No command specified. Use -h for help."
        ;;
esac