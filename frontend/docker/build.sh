#!/bin/bash

# Docker build script for Invoice Assistant Frontend
set -e

# Configuration
IMAGE_NAME="invoice-assistant-frontend"
BUILD_MODE=${BUILD_MODE:-production}
TAG=${TAG:-latest}
REGISTRY=${REGISTRY:-""}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Functions
log() {
    echo -e "${GREEN}[BUILD]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

check_env() {
    if [ ! -f ".env" ] && [ ! -f ".env.${BUILD_MODE}" ]; then
        error "Environment file not found. Please create .env or .env.${BUILD_MODE}"
    fi
}

# Main build process
main() {
    log "Starting Docker build for Invoice Assistant Frontend"
    log "Build mode: ${BUILD_MODE}"
    log "Image tag: ${IMAGE_NAME}:${TAG}"
    
    # Check if we're in the right directory
    if [ ! -f "package.json" ]; then
        error "package.json not found. Please run this script from the frontend directory."
    fi
    
    # Check environment files
    check_env
    
    # Load environment variables if .env exists
    if [ -f ".env" ]; then
        log "Loading environment variables from .env"
        export $(grep -v '^#' .env | xargs)
    fi
    
    # Load mode-specific environment variables
    if [ -f ".env.${BUILD_MODE}" ]; then
        log "Loading environment variables from .env.${BUILD_MODE}"
        export $(grep -v '^#' .env.${BUILD_MODE} | xargs)
    fi
    
    # Build Docker image
    log "Building Docker image..."
    docker build \
        -f docker/Dockerfile \
        --build-arg BUILD_MODE=${BUILD_MODE} \
        -t ${IMAGE_NAME}:${TAG} \
        -t ${IMAGE_NAME}:${BUILD_MODE} \
        .
    
    # Tag for registry if specified
    if [ -n "$REGISTRY" ]; then
        log "Tagging for registry: ${REGISTRY}"
        docker tag ${IMAGE_NAME}:${TAG} ${REGISTRY}/${IMAGE_NAME}:${TAG}
        docker tag ${IMAGE_NAME}:${TAG} ${REGISTRY}/${IMAGE_NAME}:${BUILD_MODE}
    fi
    
    log "Build completed successfully!"
    log "Image: ${IMAGE_NAME}:${TAG}"
    
    # Show image info
    docker images ${IMAGE_NAME} --format "table {{.Repository}}\t{{.Tag}}\t{{.Size}}\t{{.CreatedAt}}"
}

# Help function
show_help() {
    cat << EOF
Invoice Assistant Frontend Docker Build Script

Usage: $0 [OPTIONS]

Options:
    -m, --mode MODE         Build mode (local, staging, production) [default: production]
    -t, --tag TAG          Image tag [default: latest]
    -r, --registry URL     Container registry URL
    -h, --help            Show this help message

Examples:
    $0                                          # Build production image
    $0 -m staging -t v2.0.22                   # Build staging image with custom tag
    $0 -r docker.io/myorg -t latest           # Build and tag for registry

Environment Variables:
    BUILD_MODE             Build mode override
    TAG                    Image tag override
    REGISTRY              Registry URL override
EOF
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -m|--mode)
            BUILD_MODE="$2"
            shift 2
            ;;
        -t|--tag)
            TAG="$2"
            shift 2
            ;;
        -r|--registry)
            REGISTRY="$2"
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

# Run main function
main