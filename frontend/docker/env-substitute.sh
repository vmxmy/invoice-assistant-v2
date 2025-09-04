#!/bin/sh

# Environment variable substitution for runtime configuration
# This script runs at container startup to inject environment variables

# Find all HTML and JS files and substitute environment variables
find /usr/share/nginx/html -name '*.html' -o -name '*.js' -o -name '*.css' | while read -r file; do
    # Create backup
    cp "$file" "$file.bak"
    
    # Substitute environment variables
    envsubst '
        $VITE_SUPABASE_URL
        $VITE_SUPABASE_ANON_KEY
        $VITE_SUPABASE_SERVICE_KEY
        $DB_URL
        $VITE_APP_ENV
        $VITE_APP_NAME
        $VITE_APP_VERSION
        $VITE_API_BASE_URL
        $VITE_ENABLE_ANALYTICS
        $VITE_ENABLE_DEBUG
    ' < "$file.bak" > "$file"
    
    # Remove backup
    rm "$file.bak"
done

# Also substitute in nginx config if needed
if [ -n "$VITE_API_BASE_URL" ]; then
    envsubst '$VITE_API_BASE_URL' < /etc/nginx/nginx.conf > /tmp/nginx.conf
    mv /tmp/nginx.conf /etc/nginx/nginx.conf
fi

echo "Environment variable substitution completed"