<!-- Vue.js + Supabase 用户注册组件 -->
<!-- 文件: src/components/SignUp.vue -->

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
    <div class="max-w-md w-full space-y-8">
      <div class="bg-white p-8 rounded-lg shadow-md">
        
        <!-- 第1步: 注册表单 -->
        <form v-if="step === 1" @submit.prevent="handleSignUp" class="space-y-4">
          <h2 class="text-2xl font-bold text-center text-gray-900">用户注册</h2>
          
          <div>
            <label class="block text-sm font-medium text-gray-700">邮箱地址</label>
            <input
              v-model="formData.email"
              type="email"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">显示名称</label>
            <input
              v-model="formData.displayName"
              type="text"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="您的姓名"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">密码</label>
            <input
              v-model="formData.password"
              type="password"
              required
              minlength="8"
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="至少8位字符"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-gray-700">确认密码</label>
            <input
              v-model="formData.confirmPassword"
              type="password"
              required
              class="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="再次输入密码"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {{ loading ? '注册中...' : '创建账户' }}
          </button>
        </form>

        <!-- 第2步: 邮箱验证 -->
        <div v-else-if="step === 2" class="text-center space-y-4">
          <h2 class="text-2xl font-bold text-gray-900">验证邮箱</h2>
          <div class="bg-blue-50 border border-blue-200 rounded-md p-4">
            <p class="text-blue-800">
              我们已向 <strong>{{ formData.email }}</strong> 发送确认邮件。
            </p>
            <p class="text-blue-600 text-sm mt-2">
              请检查邮箱并点击确认链接以完成注册。
            </p>
          </div>
          
          <button
            @click="resendConfirmation"
            :disabled="loading"
            class="text-blue-600 hover:text-blue-800 text-sm underline disabled:text-gray-400"
          >
            {{ loading ? '发送中...' : '重新发送确认邮件' }}
          </button>
        </div>

        <!-- 第3步: 注册完成 -->
        <div v-else-if="step === 3" class="text-center space-y-4">
          <div class="text-green-600 text-6xl">✓</div>
          <h2 class="text-2xl font-bold text-green-800">注册成功！</h2>
          <p class="text-gray-600">
            欢迎使用发票助手！您现在可以开始上传和管理发票了。
          </p>
          <button
            @click="goToDashboard"
            class="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            进入系统
          </button>
        </div>

        <!-- 消息提示 -->
        <div
          v-if="message"
          class="mt-4 p-3 rounded-md text-sm"
          :class="messageClass"
        >
          {{ message }}
        </div>
      </div>

      <div class="text-center">
        <p class="text-sm text-gray-600">
          已有账户？
          <router-link to="/login" class="text-blue-600 hover:text-blue-800">
            立即登录
          </router-link>
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import { createClient } from '@supabase/supabase-js'

// Supabase 配置
const supabaseUrl = 'https://sfenhhtvcyslxplvewmt.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmZW5oaHR2Y3lzbHhwbHZld210Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTEyNjU4NjAsImV4cCI6MjA2Njg0MTg2MH0.ie2o7HgekEV4FaLjEpFx30KShRh2P-u0XnSQRjH1uwE'

const supabase = createClient(supabaseUrl, supabaseKey)

export default {
  name: 'SignUp',
  data() {
    return {
      formData: {
        email: '',
        password: '',
        confirmPassword: '',
        displayName: ''
      },
      loading: false,
      message: '',
      step: 1, // 1: 注册, 2: 邮箱验证, 3: 完成
      authSubscription: null
    }
  },
  computed: {
    messageClass() {
      return this.message.includes('成功') || this.message.includes('完成')
        ? 'bg-green-50 text-green-800 border border-green-200'
        : 'bg-red-50 text-red-800 border border-red-200'
    }
  },
  methods: {
    async handleSignUp() {
      if (this.formData.password !== this.formData.confirmPassword) {
        this.message = '密码不匹配'
        return
      }

      this.loading = true
      this.message = ''

      try {
        // 通过Supabase注册用户
        const { data, error } = await supabase.auth.signUp({
          email: this.formData.email,
          password: this.formData.password,
          options: {
            data: {
              display_name: this.formData.displayName,
            }
          }
        })

        if (error) {
          throw error
        }

        if (data.user) {
          this.message = '注册成功！请检查邮箱并点击确认链接。'
          this.step = 2
          this.monitorAuthState()
        }
      } catch (error) {
        this.message = `注册失败: ${error.message}`
      } finally {
        this.loading = false
      }
    },

    monitorAuthState() {
      // 监听认证状态变化
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        async (event, session) => {
          if (event === 'SIGNED_IN' && session) {
            console.log('用户已登录，创建Profile...')
            await this.createUserProfile(session.access_token)
            this.step = 3
          }
        }
      )

      this.authSubscription = subscription
    },

    async createUserProfile(accessToken) {
      try {
        const response = await fetch('http://localhost:8090/api/v1/profiles/me', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            display_name: this.formData.displayName,
            bio: '新用户',
          }),
        })

        if (response.ok) {
          const profile = await response.json()
          console.log('Profile创建成功:', profile)
          this.message = '账户设置完成！欢迎使用发票助手。'
          
          // 存储用户信息到 Vuex/Pinia
          this.$store.dispatch('auth/setUser', profile)
        } else {
          const error = await response.json()
          console.error('Profile创建失败:', error)
          this.message = '账户创建成功，但Profile设置失败，请稍后重试。'
        }
      } catch (error) {
        console.error('Profile创建错误:', error)
        this.message = '网络错误，请检查连接。'
      }
    },

    async resendConfirmation() {
      this.loading = true
      try {
        const { error } = await supabase.auth.resend({
          type: 'signup',
          email: this.formData.email
        })

        if (error) throw error
        this.message = '确认邮件已重新发送！'
      } catch (error) {
        this.message = `发送失败: ${error.message}`
      } finally {
        this.loading = false
      }
    },

    goToDashboard() {
      this.$router.push('/dashboard')
    }
  },

  beforeUnmount() {
    // 清理认证监听器
    if (this.authSubscription) {
      this.authSubscription.unsubscribe()
    }
  }
}
</script>

<style scoped>
/* 可以添加自定义样式 */
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>