#!/usr/bin/env python3
"""
使用ngrok暴露本地文件服务器，使其可以从外网访问
需要先安装: pip install pyngrok
"""
import os
import time
from flask import Flask, send_file, abort
from pyngrok import ngrok
import hashlib
import threading

class NgrokFileServer:
    def __init__(self, port=8889):
        self.port = port
        self.app = Flask(__name__)
        self.file_mapping = {}
        self.public_url = None
        
        # 设置路由
        self.app.route('/pdf/<file_id>')(self.serve_pdf)
        
    def add_file(self, file_path):
        """添加文件并返回公网访问URL"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")
        
        # 生成安全的文件ID
        file_id = hashlib.md5(file_path.encode()).hexdigest()
        self.file_mapping[file_id] = file_path
        
        # 返回公网URL
        if self.public_url:
            return f"{self.public_url}/pdf/{file_id}"
        return None
    
    def serve_pdf(self, file_id):
        """提供PDF文件访问"""
        if file_id not in self.file_mapping:
            abort(404)
        
        file_path = self.file_mapping[file_id]
        if not os.path.exists(file_path):
            abort(404)
        
        return send_file(file_path, mimetype='application/pdf')
    
    def start(self):
        """启动服务器并创建ngrok隧道"""
        # 启动Flask应用
        thread = threading.Thread(
            target=lambda: self.app.run(port=self.port, debug=False)
        )
        thread.daemon = True
        thread.start()
        
        # 等待服务器启动
        time.sleep(1)
        
        # 创建ngrok隧道
        try:
            # 设置ngrok配置（如果有认证token）
            # ngrok.set_auth_token("YOUR_NGROK_AUTH_TOKEN")
            
            # 创建隧道
            tunnel = ngrok.connect(self.port, "http")
            self.public_url = tunnel.public_url
            print(f"Ngrok隧道已创建: {self.public_url}")
            return self.public_url
        except Exception as e:
            print(f"创建ngrok隧道失败: {e}")
            print("请确保已安装ngrok: pip install pyngrok")
            return None
    
    def stop(self):
        """停止服务器和ngrok隧道"""
        ngrok.disconnect_all()
        ngrok.kill()
        print("Ngrok隧道已关闭")

# 使用示例
if __name__ == "__main__":
    # 创建并启动服务器
    server = NgrokFileServer()
    public_url = server.start()
    
    if public_url:
        # 添加PDF文件
        pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf"
        pdf_url = server.add_file(pdf_path)
        print(f"PDF公网访问URL: {pdf_url}")
        
        # 这个URL可以被MineRu API访问
        print("\n可以使用此URL调用MineRu API")
        
        # 保持服务器运行
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            server.stop()