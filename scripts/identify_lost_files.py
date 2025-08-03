#!/usr/bin/env python3
import os
import subprocess

def identify_files():
    """
    Identifies files in the .git/lost-found/other directory by inspecting their content.
    """
    lost_found_dir = '.git/lost-found/other'
    if not os.path.isdir(lost_found_dir):
        print(f"Error: Directory '{lost_found_dir}' not found.")
        print("Please run 'git fsck --lost-found' first.")
        return

    print(f"🔍 Analyzing files in {lost_found_dir}...\n")

    identified_files = []

    for filename in os.listdir(lost_found_dir):
        filepath = os.path.join(lost_found_dir, filename)
        if not os.path.isfile(filepath):
            continue

        try:
            # Use 'git cat-file -p' to read the content correctly
            result = subprocess.run(['git', 'cat-file', '-p', filename], capture_output=True, text=True, check=True, encoding='utf-8', errors='ignore')
            content = result.stdout
            
            file_info = {
                "hash": filename,
                "type": "Unknown",
                "clues": set(),
                "path_suggestion": ""
            }

            # Simple content sniffing
            lines = content.splitlines()
            if not lines:
                file_info["type"] = "Empty"
                continue

            first_line = lines[0]

            # TypeScript/JavaScript (.tsx, .ts, .js)
            if 'React' in content or 'import' in content or 'export' in content or 'const ' in content or 'function ' in content:
                file_info["type"] = "Script (TS/JS)"
                for line in lines[:20]: # Check top 20 lines for clues
                    if 'React.FC' in line or 'const ' in line and '=>' in line:
                        try:
                            # Try to extract component name: const MyComponent: React.FC = () => {
                            component_name = line.split('const ')[1].split(':')[0].split('=')[0].strip()
                            file_info["clues"].add(f"Component: {component_name}")
                        except IndexError:
                            pass
                    if 'interface ' in line:
                        try:
                            interface_name = line.split('interface ')[1].split('{')[0].strip()
                            file_info["clues"].add(f"Interface: {interface_name}")
                        except IndexError:
                            pass
                    if 'from ' in line:
                        path = line.split('from ')[1].strip().replace("'", "").replace('"', "").replace(';', '')
                        if path.startswith('.'):
                             file_info["clues"].add(f"Imports: {path}")


            # JSON
            if first_line.strip().startswith('{') and '"name":' in content and '"version":' in content:
                file_info["type"] = "JSON (package.json?)"
                file_info["path_suggestion"] = "package.json"

            # HTML
            if first_line.strip().lower().startswith('<!doctype html>') or first_line.strip().lower().startswith('<html>'):
                file_info["type"] = "HTML"

            # CSS
            if 'body {' in content or 'font-family:' in content or '.btn {' in content:
                file_info["type"] = "CSS"
            
            # Markdown
            if first_line.strip().startswith('#'):
                file_info["type"] = "Markdown"
                file_info["clues"].add(f"Title: {first_line.strip()}")


            identified_files.append(file_info)

        except subprocess.CalledProcessError as e:
            print(f"Could not read object {filename}: {e}")
        except Exception as e:
            print(f"An error occurred with file {filename}: {e}")

    # Print report
    print("--- Identification Report ---")
    for info in sorted(identified_files, key=lambda x: x['type']):
        clues_str = ", ".join(list(info['clues'])[:3]) # Show max 3 clues
        print(f"  - Hash: {info['hash']}")
        print(f"    Type: {info['type']}")
        if clues_str:
            print(f"    Clues: {clues_str}")
        print("-" * 20)


if __name__ == "__main__":
    identify_files()
