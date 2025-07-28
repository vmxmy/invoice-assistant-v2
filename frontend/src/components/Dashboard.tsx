// Dashboard 组件 - 主页面（使用新的C端优化界面）
import React from 'react'
import NewInvoiceCentricDashboard from './dashboard/NewInvoiceCentricDashboard'
import Layout from './layout/Layout'

const Dashboard: React.FC = () => {
  return (
    <Layout>
      <NewInvoiceCentricDashboard />
    </Layout>
  )
}

export default Dashboard