import requests
import os
import time
import json
from dotenv import load_dotenv

# --- Configuration ---
# Load environment variables from .env file
load_dotenv()
MINERU_API_TOKEN = os.getenv('MINERU_API_TOKEN')
if not MINERU_API_TOKEN:
    raise ValueError("MINERU_API_TOKEN not found in .env file. Please ensure it is set.")

API_BASE_URL = 'https://mineru.net/api/v4'
HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {MINERU_API_TOKEN}'
}
# Polling interval in seconds.
POLL_INTERVAL_SECONDS = 15
# Polling timeout in seconds.
POLL_TIMEOUT_SECONDS = 600


def request_upload_urls(files_to_upload):
    """
    Requests pre-signed URLs for uploading files.
    :param files_to_upload: A list of dicts, e.g., [{"name": "demo.pdf", "data_id": "some_unique_id"}]
    :return: A tuple of (batch_id, file_urls) or (None, None) on failure.
    """
    url = f"{API_BASE_URL}/file-urls/batch"
    data = {
        "enable_table": True,
        "files": files_to_upload
    }
    print("Step 1: Requesting upload URLs...")
    try:
        response = requests.post(url, headers=HEADERS, json=data, timeout=30)
        response.raise_for_status()  # Raise an exception for bad status codes (4xx or 5xx)
        result = response.json()
        if result.get("code") == 0:
            batch_id = result["data"]["batch_id"]
            file_urls = result["data"]["file_urls"]
            print(f"-> Successfully got batch_id: {batch_id}")
            return batch_id, file_urls
        else:
            print(f"-> API Error while requesting URLs: {result.get('msg')}")
            return None, None
    except requests.exceptions.RequestException as e:
        print(f"-> HTTP Request failed: {e}")
        return None, None


def upload_files(local_files, upload_urls):
    """
    Uploads local files to the provided pre-signed URLs.
    :param local_files: A list of local file paths.
    :param upload_urls: A list of pre-signed URLs from the API.
    :return: True if all uploads are successful, False otherwise.
    """
    print("\nStep 2: Uploading files...")
    if len(local_files) != len(upload_urls):
        print("-> Error: Mismatch between number of local files and upload URLs.")
        return False

    all_successful = True
    for i, file_path in enumerate(local_files):
        upload_url = upload_urls[i]
        print(f"-> Uploading {file_path}...")
        try:
            with open(file_path, 'rb') as f:
                # Per documentation, no Content-Type header is needed for this PUT request
                upload_response = requests.put(upload_url, data=f, timeout=300)  # 5 min timeout for upload
                upload_response.raise_for_status()
                print(f"-> Successfully uploaded {file_path}")
        except FileNotFoundError:
            print(f"-> Error: Local file not found at {file_path}")
            all_successful = False
            break
        except requests.exceptions.RequestException as e:
            print(f"-> Upload failed for {file_path}: {e}")
            all_successful = False
            break
    return all_successful


def poll_for_results(batch_id):
    """
    Polls for the results of a batch job until it's done, failed, or timed out.
    :param batch_id: The batch_id to poll.
    :return: The final API result dictionary, or None on timeout/failure.
    """
    url = f"{API_BASE_URL}/extract-results/batch/{batch_id}"
    start_time = time.time()
    print(f"\nStep 4: Polling for results for batch_id: {batch_id}.")
    print(f"-> Timeout set to {POLL_TIMEOUT_SECONDS} seconds.")
    
    while time.time() - start_time < POLL_TIMEOUT_SECONDS:
        try:
            response = requests.get(url, headers=HEADERS, timeout=30)
            response.raise_for_status()
            result = response.json()

            if result.get("code") == 0:
                tasks = result.get("data", {}).get("extract_result", [])
                if not tasks:
                    print("-> Status: Waiting for tasks to be created by the server...")
                else:
                    total_tasks = len(tasks)
                    done_count = 0
                    failed_count = 0
                    
                    for task in tasks:
                        state = task.get("state")
                        if state == 'done':
                            done_count += 1
                        elif state == 'failed':
                            failed_count += 1
                            print(f"-> WARNING: Task for file '{task.get('file_name')}' failed: {task.get('err_msg')}")
                    
                    print(f"-> Status: {done_count} Done, {failed_count} Failed, {total_tasks - done_count - failed_count} In Progress (out of {total_tasks} total).")

                    if (done_count + failed_count) == total_tasks:
                        print("-> All tasks have completed.")
                        return result
            else:
                print(f"-> API Error while polling: {result.get('msg')}")

        except requests.exceptions.RequestException as e:
            print(f"-> HTTP Request failed while polling: {e}")
        
        print(f"-> Waiting for {POLL_INTERVAL_SECONDS} seconds before next poll...")
        time.sleep(POLL_INTERVAL_SECONDS)

    print("-> Polling timed out.")
    return None


if __name__ == "__main__":
    # --- IMPORTANT: CONFIGURE YOUR FILES HERE ---
    # List the full paths to the local files you want to upload.
    # I have added a placeholder based on your project structure.
    # PLEASE REPLACE IT WITH THE ACTUAL FILE(S) YOU WANT TO PROCESS.
    local_file_paths = [
        "/Users/xumingyang/app/invoice_assist/v2/docs/prd/prd.md"
    ]
    
    if not all(os.path.exists(p) for p in local_file_paths):
        raise FileNotFoundError(f"One of the files in 'local_file_paths' does not exist. Please check the paths.")

    # This list is sent to the API to request the upload URLs.
    files_for_api = [{"name": os.path.basename(p), "data_id": f"cli-upload-{i}"} for i, p in enumerate(local_file_paths)]

    # --- WORKFLOW EXECUTION ---
    batch_id, urls = request_upload_urls(files_for_api)

    if batch_id and urls:
        upload_successful = upload_files(local_file_paths, urls)

        if upload_successful:
            print("\nStep 3: All files uploaded. Starting to poll for results...")
            # No initial wait, start polling immediately.
            final_results = poll_for_results(batch_id)

            if final_results:
                print("\n--- FINAL RESULTS ---")
                print(json.dumps(final_results, indent=2, ensure_ascii=False))
            else:
                print("\nCould not retrieve final results.")
    else:
        print("\nFailed to start the batch process. Halting.")
