import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/layout/Layout'

const EmailAccountsPage: React.FC = () => {
  const navigate = useNavigate()
  const { user } = useAuth()

  return (
    <Layout title="邮箱配置管理">
      <div className="container mx-auto p-4 max-w-6xl">
        {/* 页面标题和操作栏 */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">邮箱配置管理</h1>
          <button className="btn btn-primary">
            添加邮箱账户
          </button>
        </div>

        {/* 邮箱账户列表 - 空状态 */}
        <div className="card bg-base-100 shadow-lg border border-base-200 p-8 text-center">
          <div className="mb-4">
            <svg className="w-24 h-24 mx-auto text-base-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold mb-2">暂无邮箱账户</h3>
          <p className="text-base-content/60 mb-4">
            添加邮箱账户以自动扫描和导入发票
          </p>
          <button className="btn btn-primary">
            添加第一个邮箱账户
          </button>
        </div>

        {/* 配置指南 */}
        <div className="mt-8">
          <div className="collapse collapse-arrow bg-base-100 border border-base-200">
            <input type="checkbox" />
            <div className="collapse-title text-lg font-medium">
              邮箱配置指南
            </div>
            <div className="collapse-content">
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Gmail OAuth2 配置指南</h4>
                  <p className="text-base-content/80">
                    1. 访问 Google Cloud Console 创建 OAuth2 应用<br />
                    2. 配置重定向 URI<br />
                    3. 获取客户端 ID 和密钥
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">QQ邮箱授权码获取方法</h4>
                  <p className="text-base-content/80">
                    1. 登录 QQ 邮箱网页版<br />
                    2. 进入设置 → 账户<br />
                    3. 开启 POP3/SMTP 服务并生成授权码
                  </p>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">163邮箱SMTP设置</h4>
                  <p className="text-base-content/80">
                    1. 登录 163 邮箱<br />
                    2. 设置 → POP3/SMTP/IMAP<br />
                    3. 开启服务并获取授权密码
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default EmailAccountsPage