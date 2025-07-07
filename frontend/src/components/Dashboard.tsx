// Dashboard 组件 - 主页面
import React from 'react'
import { DashboardMain } from './dashboard/DashboardMain'
import Layout from './layout/Layout'

const Dashboard: React.FC = () => {
  return (
    <Layout>
      <DashboardMain />
    </Layout>
  )
}

export default Dashboard