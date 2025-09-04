#!/bin/bash

# Docker build performance monitoring script
set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPORT_DIR="$SCRIPT_DIR/performance-reports"
DOCKERFILE="$SCRIPT_DIR/Dockerfile"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m'

# Functions
log() {
    echo -e "${GREEN}[PERF]${NC} $1"
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

# Create report directory
mkdir -p "$REPORT_DIR"

# Performance benchmarking
benchmark_build() {
    local test_name=$1
    local build_args=$2
    local report_file="$REPORT_DIR/benchmark-$(date +%Y%m%d-%H%M%S).json"
    
    log "Starting build performance benchmark: $test_name"
    
    # Record start time and system info
    local start_time=$(date +%s.%N)
    local start_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # System information
    local cpu_count=$(nproc)
    local memory_total=$(free -h | awk '/^Mem:/ {print $2}')
    local disk_available=$(df -h . | awk 'NR==2 {print $4}')
    
    info "System Info - CPU: $cpu_count cores, Memory: $memory_total, Disk: $disk_available available"
    
    # Build with time and resource monitoring
    local image_tag="perf-test:$test_name-$(date +%s)"
    
    log "Building image: $image_tag"
    
    # Monitor system resources during build
    (
        while true; do
            echo "$(date +%s.%N),$(cat /proc/loadavg | cut -d' ' -f1),$(free | grep '^Mem:' | awk '{print $3/$2*100}')" >> "$REPORT_DIR/resources-$test_name.csv"
            sleep 1
        done
    ) &
    local monitor_pid=$!
    
    # Execute build
    local build_output
    local build_exit_code
    
    if build_output=$(docker build $build_args -t "$image_tag" -f "$DOCKERFILE" ../. 2>&1); then
        build_exit_code=0
    else
        build_exit_code=$?
    fi
    
    # Stop resource monitoring
    kill $monitor_pid 2>/dev/null || true
    
    # Record end time
    local end_time=$(date +%s.%N)
    local build_duration=$(echo "$end_time - $start_time" | bc)
    local end_timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    
    # Get image information
    local image_size=""
    local image_layers=""
    if [ $build_exit_code -eq 0 ]; then
        image_size=$(docker images "$image_tag" --format "{{.Size}}")
        image_layers=$(docker history "$image_tag" --format "{{.Size}}" | wc -l)
    fi
    
    # Analyze build output for cache hits/misses
    local cache_hits=$(echo "$build_output" | grep -c "CACHED" || echo "0")
    local cache_misses=$(echo "$build_output" | grep -c "RUN\|COPY\|ADD" || echo "0")
    local cache_hit_rate=0
    if [ $cache_misses -gt 0 ]; then
        cache_hit_rate=$(echo "scale=2; $cache_hits / ($cache_hits + $cache_misses) * 100" | bc -l)
    fi
    
    # Docker layer analysis
    local layer_analysis=""
    if [ $build_exit_code -eq 0 ]; then
        layer_analysis=$(docker history "$image_tag" --format "table {{.Size}}\t{{.CreatedBy}}" | head -10)
    fi
    
    # Generate detailed report
    cat << EOF > "$report_file"
{
  "test_name": "$test_name",
  "timestamp": {
    "start": "$start_timestamp",
    "end": "$end_timestamp"
  },
  "build": {
    "duration_seconds": $build_duration,
    "exit_code": $build_exit_code,
    "cache_hits": $cache_hits,
    "cache_misses": $cache_misses,
    "cache_hit_rate": $cache_hit_rate
  },
  "image": {
    "tag": "$image_tag",
    "size": "$image_size",
    "layers": $image_layers
  },
  "system": {
    "cpu_cores": $cpu_count,
    "memory_total": "$memory_total",
    "disk_available": "$disk_available"
  },
  "build_args": "$build_args"
}
EOF
    
    # Output summary
    if [ $build_exit_code -eq 0 ]; then
        success "Build completed successfully in ${build_duration}s"
        info "Image size: $image_size"
        info "Cache hit rate: ${cache_hit_rate}%"
    else
        error "Build failed after ${build_duration}s"
    fi
    
    # Clean up test image
    if [ $build_exit_code -eq 0 ]; then
        docker rmi "$image_tag" >/dev/null 2>&1 || true
    fi
    
    echo "$report_file"
}

# Comprehensive build analysis
analyze_dockerfile() {
    log "Analyzing Dockerfile for optimization opportunities..."
    
    local dockerfile_analysis="$REPORT_DIR/dockerfile-analysis-$(date +%Y%m%d-%H%M%S).txt"
    
    cat << EOF > "$dockerfile_analysis"
Dockerfile Analysis Report
Generated: $(date)

=== Dockerfile Content ===
$(cat "$DOCKERFILE" | nl)

=== Analysis Results ===

EOF
    
    # Check for common optimization issues
    local issues=()
    
    # Check for package manager cache cleaning
    if ! grep -q "apt.*clean\|apk.*cache.*clean\|yum.*clean" "$DOCKERFILE"; then
        issues+=("❌ Package manager cache not cleaned - increases image size")
    else
        issues+=("✅ Package manager cache cleaned")
    fi
    
    # Check for multi-stage builds
    if grep -q "FROM.*AS" "$DOCKERFILE"; then
        issues+=("✅ Multi-stage build detected")
    else
        issues+=("⚠️ Consider using multi-stage builds for smaller images")
    fi
    
    # Check for .dockerignore
    if [ -f "../.dockerignore" ]; then
        issues+=("✅ .dockerignore file exists")
    else
        issues+=("❌ Missing .dockerignore file - may include unnecessary files")
    fi
    
    # Check for layer optimization
    local run_count=$(grep -c "^RUN " "$DOCKERFILE" || echo "0")
    if [ $run_count -gt 10 ]; then
        issues+=("⚠️ Many RUN commands ($run_count) - consider combining for fewer layers")
    else
        issues+=("✅ Reasonable number of layers")
    fi
    
    # Add findings to report
    for issue in "${issues[@]}"; do
        echo "$issue" >> "$dockerfile_analysis"
    done
    
    cat << EOF >> "$dockerfile_analysis"

=== Recommendations ===
1. Use multi-stage builds to separate build and runtime dependencies
2. Combine related RUN commands to reduce layers
3. Use .dockerignore to exclude unnecessary files
4. Clean package manager caches in the same layer they're used
5. Use specific base image tags instead of 'latest'
6. Order layers from least to most likely to change for better caching

=== Base Image Analysis ===
EOF
    
    # Analyze base images
    grep "^FROM " "$DOCKERFILE" | while read -r line; do
        local base_image=$(echo "$line" | awk '{print $2}')
        echo "Base image: $base_image" >> "$dockerfile_analysis"
        
        # Try to get image size (if available locally)
        local size=$(docker images "$base_image" --format "{{.Size}}" 2>/dev/null || echo "Not available locally")
        echo "Size: $size" >> "$dockerfile_analysis"
    done
    
    info "Dockerfile analysis saved to: $dockerfile_analysis"
    cat "$dockerfile_analysis"
}

# Performance comparison
compare_builds() {
    log "Comparing different build strategies..."
    
    local comparison_report="$REPORT_DIR/build-comparison-$(date +%Y%m%d-%H%M%S).json"
    
    # Test scenarios
    declare -A scenarios
    scenarios["no-cache"]="--no-cache"
    scenarios["with-cache"]=""
    scenarios["build-arg-production"]="--build-arg BUILD_MODE=production"
    scenarios["build-arg-development"]="--build-arg BUILD_MODE=local"
    
    local results="{"
    local first=true
    
    for scenario in "${!scenarios[@]}"; do
        if [ "$first" = false ]; then
            results="$results,"
        fi
        first=false
        
        log "Testing scenario: $scenario"
        local report_file=$(benchmark_build "$scenario" "${scenarios[$scenario]}")
        local duration=$(jq -r '.build.duration_seconds' "$report_file")
        local cache_hit_rate=$(jq -r '.build.cache_hit_rate' "$report_file")
        local exit_code=$(jq -r '.build.exit_code' "$report_file")
        
        results="$results\"$scenario\":{\"duration\":$duration,\"cache_hit_rate\":$cache_hit_rate,\"exit_code\":$exit_code}"
    done
    
    results="$results}"
    
    # Save comparison results
    echo "$results" | jq '.' > "$comparison_report"
    
    # Generate summary
    log "Build comparison completed. Results:"
    echo "$results" | jq -r 'to_entries[] | "- \(.key): \(.value.duration)s (cache: \(.value.cache_hit_rate)%)"'
    
    info "Detailed comparison saved to: $comparison_report"
}

# Resource usage monitoring
monitor_resources() {
    local duration=${1:-60}  # Default 60 seconds
    local interval=${2:-1}   # Default 1 second
    
    log "Monitoring system resources for ${duration}s..."
    
    local resource_file="$REPORT_DIR/resource-usage-$(date +%Y%m%d-%H%M%S).csv"
    
    # CSV header
    echo "timestamp,cpu_load,memory_percent,disk_io_read,disk_io_write" > "$resource_file"
    
    local end_time=$(($(date +%s) + duration))
    
    while [ $(date +%s) -lt $end_time ]; do
        local timestamp=$(date +%s)
        local cpu_load=$(cat /proc/loadavg | cut -d' ' -f1)
        local memory_percent=$(free | grep '^Mem:' | awk '{print $3/$2*100}')
        
        # Disk I/O (simplified)
        local disk_stats=$(iostat -d 1 1 2>/dev/null | tail -n +4 | head -1 | awk '{print $3","$4}' || echo "0,0")
        
        echo "$timestamp,$cpu_load,$memory_percent,$disk_stats" >> "$resource_file"
        sleep $interval
    done
    
    success "Resource monitoring completed. Data saved to: $resource_file"
    
    # Generate simple analysis
    local avg_cpu=$(awk -F, 'NR>1 {sum+=$2; count++} END {print sum/count}' "$resource_file")
    local max_memory=$(awk -F, 'NR>1 {if($3>max) max=$3} END {print max}' "$resource_file")
    
    info "Average CPU load: $avg_cpu"
    info "Peak memory usage: ${max_memory}%"
}

# Generate comprehensive performance report
generate_report() {
    log "Generating comprehensive performance report..."
    
    local final_report="$REPORT_DIR/performance-summary-$(date +%Y%m%d-%H%M%S).md"
    
    cat << EOF > "$final_report"
# 📊 Docker Build Performance Report

**Generated**: $(date)
**System**: $(uname -a)
**Docker Version**: $(docker --version)

## 🏗️ Build Analysis

$(analyze_dockerfile | tail -n +5)

## ⏱️ Performance Benchmarks

Recent benchmark results from: $REPORT_DIR

$(ls -la "$REPORT_DIR"/*.json 2>/dev/null | tail -5 || echo "No benchmark data available")

## 📈 Recommendations

### Immediate Optimizations
- [ ] Review Dockerfile layer ordering
- [ ] Implement .dockerignore file
- [ ] Use multi-stage builds
- [ ] Clean package manager caches

### Advanced Optimizations
- [ ] Implement BuildKit optimizations
- [ ] Use registry cache for CI/CD
- [ ] Consider distroless base images
- [ ] Implement image scanning

## 🔧 Tools and Commands

### Local Performance Testing
\`\`\`bash
# Run full performance analysis
./docker/performance-monitor.sh --full-analysis

# Monitor resource usage during build
./docker/performance-monitor.sh --monitor-resources 120

# Compare different build strategies
./docker/performance-monitor.sh --compare-builds
\`\`\`

### Docker Build Optimization
\`\`\`bash
# Use BuildKit for better performance
export DOCKER_BUILDKIT=1

# Build with cache from registry
docker build --cache-from registry.example.com/myapp:cache .

# Multi-platform builds
docker buildx build --platform linux/amd64,linux/arm64 .
\`\`\`

---

*Report generated by Docker Performance Monitor*
EOF
    
    success "Comprehensive report generated: $final_report"
    info "Opening report..."
    
    # Try to open the report (macOS/Linux)
    if command -v open >/dev/null; then
        open "$final_report"
    elif command -v xdg-open >/dev/null; then
        xdg-open "$final_report"
    else
        info "Please manually open: $final_report"
    fi
}

# Help function
show_help() {
    cat << EOF
Docker Build Performance Monitor

Usage: $0 [OPTIONS] [COMMAND]

Commands:
    benchmark           Run build performance benchmark
    analyze-dockerfile  Analyze Dockerfile for optimization opportunities
    compare-builds      Compare different build strategies
    monitor-resources   Monitor system resources during build
    generate-report     Generate comprehensive performance report
    clean              Clean up old reports and test images

Options:
    --duration SECONDS  Duration for resource monitoring (default: 60)
    --interval SECONDS  Monitoring interval (default: 1)
    --scenario NAME     Specific build scenario to test
    --full-analysis     Run complete performance analysis
    -h, --help         Show this help message

Examples:
    $0 benchmark                           # Quick build benchmark
    $0 compare-builds                      # Compare different strategies
    $0 monitor-resources --duration 120    # Monitor for 2 minutes
    $0 --full-analysis                     # Complete analysis
    $0 generate-report                     # Generate final report

Environment Variables:
    DOCKER_BUILDKIT=1    Enable BuildKit for better performance
    REPORT_DIR           Custom report directory (default: ./performance-reports)
EOF
}

# Main execution logic
main() {
    case "${1:-benchmark}" in
        benchmark)
            benchmark_build "default" ""
            ;;
        analyze-dockerfile)
            analyze_dockerfile
            ;;
        compare-builds)
            compare_builds
            ;;
        monitor-resources)
            monitor_resources "${2:-60}" "${3:-1}"
            ;;
        generate-report)
            generate_report
            ;;
        clean)
            log "Cleaning up old reports and test images..."
            find "$REPORT_DIR" -name "*.json" -mtime +7 -delete 2>/dev/null || true
            find "$REPORT_DIR" -name "*.csv" -mtime +7 -delete 2>/dev/null || true
            docker images -f "dangling=true" -q | xargs -r docker rmi
            success "Cleanup completed"
            ;;
        --full-analysis)
            log "Running full performance analysis..."
            analyze_dockerfile
            echo ""
            compare_builds
            echo ""
            generate_report
            ;;
        -h|--help)
            show_help
            ;;
        *)
            error "Unknown command: $1. Use -h for help."
            ;;
    esac
}

# Parse arguments
DURATION=60
INTERVAL=1

while [[ $# -gt 0 ]]; do
    case $1 in
        --duration)
            DURATION="$2"
            shift 2
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --full-analysis)
            main --full-analysis
            exit 0
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            main "$@"
            exit 0
            ;;
    esac
done

# Default action if no arguments
main benchmark