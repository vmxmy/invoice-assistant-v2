import os
import requests
import json
from pathlib import Path
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

class MineruPDFParser:
    def __init__(self):
        self.api_token = os.getenv('MINERU_API_TOKEN')
        if not self.api_token:
            raise ValueError("MINERU_API_TOKEN not found in environment variables")
        
        # Common API endpoints based on typical patterns
        self.base_url = "https://mineru.net/api"
        self.headers = {
            "Authorization": f"Bearer {self.api_token}",
            "Accept": "application/json"
        }
    
    def upload_pdf(self, pdf_path):
        """Upload PDF file to MineruNet API"""
        if not os.path.exists(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
        
        # Try common upload endpoints
        upload_endpoints = [
            f"{self.base_url}/v1/pdf/upload",
            f"{self.base_url}/pdf/upload",
            f"{self.base_url}/upload",
            f"{self.base_url}/v1/files/upload"
        ]
        
        for endpoint in upload_endpoints:
            try:
                print(f"Trying upload endpoint: {endpoint}")
                with open(pdf_path, 'rb') as f:
                    files = {'file': (os.path.basename(pdf_path), f, 'application/pdf')}
                    response = requests.post(
                        endpoint,
                        headers=self.headers,
                        files=files,
                        timeout=30
                    )
                
                if response.status_code == 200:
                    print(f"Successfully uploaded to {endpoint}")
                    return response.json()
                else:
                    print(f"Failed at {endpoint}: {response.status_code} - {response.text}")
            
            except requests.exceptions.RequestException as e:
                print(f"Error with {endpoint}: {str(e)}")
                continue
        
        # If no endpoint worked, try a simple parse endpoint
        return self.parse_pdf_direct(pdf_path)
    
    def parse_pdf_direct(self, pdf_path):
        """Try direct PDF parsing endpoints"""
        parse_endpoints = [
            f"{self.base_url}/v1/pdf/parse",
            f"{self.base_url}/parse",
            f"{self.base_url}/v1/extract",
            f"{self.base_url}/extract"
        ]
        
        for endpoint in parse_endpoints:
            try:
                print(f"Trying parse endpoint: {endpoint}")
                with open(pdf_path, 'rb') as f:
                    files = {'file': (os.path.basename(pdf_path), f, 'application/pdf')}
                    response = requests.post(
                        endpoint,
                        headers=self.headers,
                        files=files,
                        timeout=60
                    )
                
                if response.status_code == 200:
                    print(f"Successfully parsed at {endpoint}")
                    return response.json()
                else:
                    print(f"Failed at {endpoint}: {response.status_code} - {response.text}")
            
            except requests.exceptions.RequestException as e:
                print(f"Error with {endpoint}: {str(e)}")
                continue
        
        raise Exception("Could not find working API endpoint")
    
    def get_parsing_result(self, task_id):
        """Get parsing result by task ID"""
        result_endpoints = [
            f"{self.base_url}/v1/pdf/result/{task_id}",
            f"{self.base_url}/result/{task_id}",
            f"{self.base_url}/v1/tasks/{task_id}",
            f"{self.base_url}/tasks/{task_id}"
        ]
        
        for endpoint in result_endpoints:
            try:
                print(f"Trying result endpoint: {endpoint}")
                response = requests.get(
                    endpoint,
                    headers=self.headers,
                    timeout=30
                )
                
                if response.status_code == 200:
                    print(f"Successfully got result from {endpoint}")
                    return response.json()
                else:
                    print(f"Failed at {endpoint}: {response.status_code} - {response.text}")
            
            except requests.exceptions.RequestException as e:
                print(f"Error with {endpoint}: {str(e)}")
                continue
        
        return None
    
    def parse_pdf(self, pdf_path):
        """Main method to parse PDF"""
        print(f"Parsing PDF: {pdf_path}")
        
        try:
            # Try to upload/parse the PDF
            result = self.upload_pdf(pdf_path)
            
            # Check if we got a task ID (async processing)
            if isinstance(result, dict) and 'task_id' in result:
                task_id = result['task_id']
                print(f"Task ID: {task_id}")
                print("Waiting for processing...")
                
                # Poll for results
                max_attempts = 30
                for i in range(max_attempts):
                    time.sleep(2)
                    task_result = self.get_parsing_result(task_id)
                    if task_result and task_result.get('status') == 'completed':
                        return task_result
                    print(f"Attempt {i+1}/{max_attempts}: Processing...")
                
                return {"error": "Timeout waiting for results"}
            
            # Direct result
            return result
            
        except Exception as e:
            return {"error": str(e)}


def main():
    # Initialize parser
    parser = MineruPDFParser()
    
    # PDF file path
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf"
    
    # Parse the PDF
    result = parser.parse_pdf(pdf_path)
    
    # Save result to file
    output_dir = Path("/Users/xumingyang/app/invoice_assist/output_mineru")
    output_dir.mkdir(exist_ok=True)
    
    output_file = output_dir / f"{Path(pdf_path).stem}_result.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    
    print(f"\nResult saved to: {output_file}")
    print("\nParsing Result:")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()