#!/usr/bin/env python3
"""
本地文件服务器，用于为MineRu API提供PDF文件的HTTP访问
"""
import os
import threading
import time
from flask import Flask, send_file, abort
from werkzeug.serving import make_server
import hashlib

class LocalFileServer:
    def __init__(self, host='127.0.0.1', port=8888):
        self.host = host
        self.port = port
        self.app = Flask(__name__)
        self.server = None
        self.thread = None
        self.file_mapping = {}  # 文件路径到安全ID的映射
        
        # 设置路由
        self.app.route('/pdf/<file_id>')(self.serve_pdf)
        
    def add_file(self, file_path):
        """添加文件并返回访问URL"""
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"文件不存在: {file_path}")
        
        # 生成安全的文件ID
        file_id = hashlib.md5(file_path.encode()).hexdigest()
        self.file_mapping[file_id] = file_path
        
        # 返回访问URL
        return f"http://{self.host}:{self.port}/pdf/{file_id}"
    
    def serve_pdf(self, file_id):
        """提供PDF文件访问"""
        if file_id not in self.file_mapping:
            abort(404)
        
        file_path = self.file_mapping[file_id]
        if not os.path.exists(file_path):
            abort(404)
        
        return send_file(file_path, mimetype='application/pdf')
    
    def start(self):
        """启动服务器"""
        self.server = make_server(self.host, self.port, self.app)
        self.thread = threading.Thread(target=self.server.serve_forever)
        self.thread.daemon = True
        self.thread.start()
        
        # 等待服务器启动
        time.sleep(0.5)
        print(f"本地文件服务器已启动: http://{self.host}:{self.port}")
    
    def stop(self):
        """停止服务器"""
        if self.server:
            self.server.shutdown()
            print("本地文件服务器已停止")

# 使用示例
if __name__ == "__main__":
    # 创建并启动服务器
    server = LocalFileServer()
    server.start()
    
    # 添加PDF文件
    pdf_path = "/Users/xumingyang/app/invoice_assist/downloads/25432000000022020617-杭州趣链科技有限公司.pdf"
    pdf_url = server.add_file(pdf_path)
    print(f"PDF访问URL: {pdf_url}")
    
    # 保持服务器运行
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        server.stop()