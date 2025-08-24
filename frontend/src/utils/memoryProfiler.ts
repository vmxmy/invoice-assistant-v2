/**
 * 内存性能分析器
 * 提供深度内存分析、性能测试和优化建议
 */

interface MemoryProfile {
  id: string;
  name: string;
  startTime: number;
  endTime: number;
  duration: number;
  initialMemory: number;
  finalMemory: number;
  peakMemory: number;
  memoryGrowth: number;
  samples: MemorySample[];
  operations: ProfileOperation[];
  recommendations: string[];
}

interface MemorySample {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss?: number;
}

interface ProfileOperation {
  name: string;
  startTime: number;
  endTime: number;
  memoryBefore: number;
  memoryAfter: number;
  impact: number;
}

interface ProfilerConfig {
  samplingInterval: number;
  trackOperations: boolean;
  generateRecommendations: boolean;
  maxProfileDuration: number;
  enableHeapAnalysis: boolean;
}

interface HeapAnalysis {
  objectTypes: Record<string, number>;
  retainedSize: number;
  shallowSize: number;
  dominatorTree?: any[];
}

interface PerformanceTest {
  name: string;
  iterations: number;
  avgMemoryGrowth: number;
  avgDuration: number;
  maxMemoryUsed: number;
  memoryLeakDetected: boolean;
  results: TestResult[];
}

interface TestResult {
  iteration: number;
  startMemory: number;
  endMemory: number;
  duration: number;
  gcEvents: number;
}

class MemoryProfiler {
  private profiles = new Map<string, MemoryProfile>();
  private activeProfiles = new Map<string, {
    profile: Partial<MemoryProfile>;
    samplingTimer: NodeJS.Timeout;
    operations: ProfileOperation[];
  }>();
  private config: ProfilerConfig;
  private performanceTests = new Map<string, PerformanceTest>();

  constructor(config: Partial<ProfilerConfig> = {}) {
    this.config = {
      samplingInterval: 100, // 100ms
      trackOperations: true,
      generateRecommendations: true,
      maxProfileDuration: 300000, // 5分钟
      enableHeapAnalysis: false,
      ...config
    };

    // 监听性能事件
    this.setupPerformanceObservers();
  }

  /**
   * 开始内存分析
   */
  startProfiling(profileName: string): string {
    const id = `${profileName}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const initialMemory = this.getCurrentMemoryUsage();
    const startTime = performance.now();
    
    const profile: Partial<MemoryProfile> = {
      id,
      name: profileName,
      startTime,
      initialMemory,
      peakMemory: initialMemory,
      samples: [],
      operations: []
    };
    
    // 开始采样
    const samplingTimer = setInterval(() => {
      const sample = this.collectMemorySample();
      profile.samples!.push(sample);
      
      // 更新峰值内存
      if (sample.heapUsed > profile.peakMemory!) {
        profile.peakMemory = sample.heapUsed;
      }
      
      // 检查是否超过最大分析时间
      if (performance.now() - startTime > this.config.maxProfileDuration) {
        this.stopProfiling(id);
      }
    }, this.config.samplingInterval);
    
    this.activeProfiles.set(id, {
      profile,
      samplingTimer,
      operations: []
    });
    
    console.log(`📊 开始内存分析: ${profileName} (${id})`);
    return id;
  }

  /**
   * 停止内存分析
   */
  stopProfiling(profileId: string): MemoryProfile | null {
    const activeProfile = this.activeProfiles.get(profileId);
    if (!activeProfile) {
      console.warn(`分析不存在: ${profileId}`);
      return null;
    }
    
    const { profile, samplingTimer, operations } = activeProfile;
    
    // 停止采样
    clearInterval(samplingTimer);
    
    // 完成分析数据
    const endTime = performance.now();
    const finalMemory = this.getCurrentMemoryUsage();
    
    const completedProfile: MemoryProfile = {
      ...profile,
      endTime,
      finalMemory,
      duration: endTime - profile.startTime!,
      memoryGrowth: finalMemory - profile.initialMemory!,
      operations,
      recommendations: this.config.generateRecommendations 
        ? this.generateRecommendations(profile as MemoryProfile, operations)
        : []
    } as MemoryProfile;
    
    this.profiles.set(profileId, completedProfile);
    this.activeProfiles.delete(profileId);
    
    console.log(`📊 完成内存分析: ${completedProfile.name}`, {
      duration: completedProfile.duration,
      memoryGrowth: completedProfile.memoryGrowth,
      peakMemory: completedProfile.peakMemory
    });
    
    return completedProfile;
  }

  /**
   * 记录操作
   */
  recordOperation(profileId: string, operationName: string, fn: () => any): any {
    const activeProfile = this.activeProfiles.get(profileId);
    if (!activeProfile || !this.config.trackOperations) {
      return fn();
    }
    
    const startTime = performance.now();
    const memoryBefore = this.getCurrentMemoryUsage();
    
    try {
      const result = fn();
      
      const endTime = performance.now();
      const memoryAfter = this.getCurrentMemoryUsage();
      
      const operation: ProfileOperation = {
        name: operationName,
        startTime,
        endTime,
        memoryBefore,
        memoryAfter,
        impact: memoryAfter - memoryBefore
      };
      
      activeProfile.operations.push(operation);
      
      return result;
    } catch (error) {
      const endTime = performance.now();
      const memoryAfter = this.getCurrentMemoryUsage();
      
      const operation: ProfileOperation = {
        name: `${operationName} (ERROR)`,
        startTime,
        endTime,
        memoryBefore,
        memoryAfter,
        impact: memoryAfter - memoryBefore
      };
      
      activeProfile.operations.push(operation);
      
      throw error;
    }
  }

  /**
   * 运行性能测试
   */
  async runPerformanceTest(
    testName: string, 
    testFunction: () => Promise<any> | any, 
    iterations: number = 10
  ): Promise<PerformanceTest> {
    console.log(`🧪 开始性能测试: ${testName} (${iterations}次迭代)`);
    
    const results: TestResult[] = [];
    let totalMemoryGrowth = 0;
    let totalDuration = 0;
    let maxMemoryUsed = 0;
    let suspiciousGrowth = 0;
    
    for (let i = 0; i < iterations; i++) {
      // 强制垃圾回收（如果可用）
      if ('gc' in window && i % 5 === 0) {
        (window as any).gc();
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const startMemory = this.getCurrentMemoryUsage();
      const startTime = performance.now();
      const gcEventsBefore = this.getGCEventCount();
      
      try {
        await testFunction();
      } catch (error) {
        console.error(`测试迭代 ${i + 1} 失败:`, error);
      }
      
      const endTime = performance.now();
      const endMemory = this.getCurrentMemoryUsage();
      const gcEventsAfter = this.getGCEventCount();
      
      const duration = endTime - startTime;
      const memoryGrowth = endMemory - startMemory;
      const gcEvents = gcEventsAfter - gcEventsBefore;
      
      results.push({
        iteration: i + 1,
        startMemory,
        endMemory,
        duration,
        gcEvents
      });
      
      totalMemoryGrowth += memoryGrowth;
      totalDuration += duration;
      maxMemoryUsed = Math.max(maxMemoryUsed, endMemory);
      
      // 检查可疑的内存增长
      if (memoryGrowth > 5) { // 超过5MB增长被认为是可疑的
        suspiciousGrowth++;
      }
      
      // 迭代间短暂休息
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const test: PerformanceTest = {
      name: testName,
      iterations,
      avgMemoryGrowth: totalMemoryGrowth / iterations,
      avgDuration: totalDuration / iterations,
      maxMemoryUsed,
      memoryLeakDetected: suspiciousGrowth > iterations * 0.7, // 超过70%的迭代有可疑增长
      results
    };
    
    this.performanceTests.set(testName, test);
    
    console.log(`🧪 性能测试完成: ${testName}`, {
      avgMemoryGrowth: test.avgMemoryGrowth.toFixed(2) + 'MB',
      avgDuration: test.avgDuration.toFixed(2) + 'ms',
      memoryLeakDetected: test.memoryLeakDetected
    });
    
    return test;
  }

  /**
   * 生成内存快照对比
   */
  async compareMemorySnapshots(beforeFn: () => any, afterFn: () => any): Promise<{
    before: MemorySample;
    after: MemorySample;
    diff: {
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    analysis: string[];
  }> {
    // 执行前的快照
    await beforeFn();
    await new Promise(resolve => setTimeout(resolve, 100)); // 等待稳定
    const before = this.collectMemorySample();
    
    // 执行操作
    await afterFn();
    await new Promise(resolve => setTimeout(resolve, 100)); // 等待稳定
    const after = this.collectMemorySample();
    
    // 计算差异
    const diff = {
      heapUsed: after.heapUsed - before.heapUsed,
      heapTotal: after.heapTotal - before.heapTotal,
      external: after.external - before.external
    };
    
    // 生成分析
    const analysis: string[] = [];
    
    if (diff.heapUsed > 10) {
      analysis.push(`堆内存增长了 ${diff.heapUsed.toFixed(2)}MB，可能存在内存泄漏`);
    } else if (diff.heapUsed < -5) {
      analysis.push(`堆内存减少了 ${Math.abs(diff.heapUsed).toFixed(2)}MB，内存得到有效释放`);
    }
    
    if (diff.external > 5) {
      analysis.push(`外部内存增长了 ${diff.external.toFixed(2)}MB，检查二进制数据和缓冲区使用`);
    }
    
    if (diff.heapTotal > diff.heapUsed + 20) {
      analysis.push(`堆内存分配超过使用量，可能存在内存碎片化`);
    }
    
    return { before, after, diff, analysis };
  }

  /**
   * 收集内存样本
   */
  private collectMemorySample(): MemorySample {
    try {
      // @ts-ignore
      const memory = (performance as any).memory;
      
      if (memory) {
        return {
          timestamp: Date.now(),
          heapUsed: memory.usedJSHeapSize / 1024 / 1024,
          heapTotal: memory.totalJSHeapSize / 1024 / 1024,
          external: 0 // 浏览器环境下external内存信息不可用
        };
      }
    } catch (error) {
      // 内存API不可用时的降级处理
    }
    
    return {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0
    };
  }

  /**
   * 获取当前内存使用
   */
  private getCurrentMemoryUsage(): number {
    try {
      // @ts-ignore
      const memory = (performance as any).memory;
      return memory ? memory.usedJSHeapSize / 1024 / 1024 : 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 获取垃圾回收事件计数
   */
  private getGCEventCount(): number {
    // 在浏览器环境中，我们无法直接获取GC事件计数
    // 这里返回一个估算值或使用性能观察器的数据
    return 0;
  }

  /**
   * 生成优化建议
   */
  private generateRecommendations(profile: MemoryProfile, operations: ProfileOperation[]): string[] {
    const recommendations: string[] = [];
    
    // 分析内存增长
    if (profile.memoryGrowth > 50) {
      recommendations.push('检测到大量内存增长，建议检查是否存在内存泄漏');
    }
    
    // 分析峰值内存
    if (profile.peakMemory > profile.initialMemory * 3) {
      recommendations.push('峰值内存使用量过高，建议优化算法或分批处理数据');
    }
    
    // 分析操作影响
    const highImpactOps = operations.filter(op => Math.abs(op.impact) > 20);
    if (highImpactOps.length > 0) {
      recommendations.push(`发现 ${highImpactOps.length} 个高内存影响操作: ${highImpactOps.map(op => op.name).join(', ')}`);
    }
    
    // 分析内存使用模式
    const samples = profile.samples;
    if (samples && samples.length > 10) {
      const growthTrend = this.analyzeGrowthTrend(samples);
      if (growthTrend.isIncreasing && growthTrend.rate > 0.1) {
        recommendations.push(`内存使用呈持续增长趋势 (${growthTrend.rate.toFixed(3)}MB/s)，可能存在泄漏`);
      }
    }
    
    // 通用建议
    if (profile.duration > 30000) { // 超过30秒的分析
      recommendations.push('长时间运行的操作应该考虑使用流式处理或分片技术');
    }
    
    return recommendations;
  }

  /**
   * 分析内存增长趋势
   */
  private analyzeGrowthTrend(samples: MemorySample[]): { isIncreasing: boolean; rate: number } {
    if (samples.length < 5) {
      return { isIncreasing: false, rate: 0 };
    }
    
    const recent = samples.slice(-10);
    let totalGrowth = 0;
    let growthPoints = 0;
    
    for (let i = 1; i < recent.length; i++) {
      const growth = recent[i].heapUsed - recent[i - 1].heapUsed;
      totalGrowth += growth;
      growthPoints++;
    }
    
    const averageGrowth = totalGrowth / growthPoints;
    const timeSpan = (recent[recent.length - 1].timestamp - recent[0].timestamp) / 1000; // 秒
    const rate = averageGrowth / timeSpan;
    
    return {
      isIncreasing: averageGrowth > 0.1, // 平均增长超过0.1MB
      rate
    };
  }

  /**
   * 设置性能观察器
   */
  private setupPerformanceObservers(): void {
    if (!('PerformanceObserver' in window)) return;
    
    try {
      // 监听GC事件
      const gcObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          console.log('🗑️ GC事件:', {
            type: entry.entryType,
            duration: entry.duration,
            startTime: entry.startTime
          });
        }
      });
      
      // 注意：'gc' 类型在大多数浏览器中不可用
      try {
        gcObserver.observe({ entryTypes: ['gc'] });
      } catch (e) {
        // GC监听不支持时忽略
      }
      
      // 监听长任务
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > 50) {
            console.warn('⏱️ 长任务检测:', {
              duration: entry.duration,
              startTime: entry.startTime
            });
          }
        }
      });
      
      longTaskObserver.observe({ entryTypes: ['longtask'] });
    } catch (error) {
      console.warn('性能观察器设置失败:', error);
    }
  }

  /**
   * 获取分析结果
   */
  getProfile(profileId: string): MemoryProfile | null {
    return this.profiles.get(profileId) || null;
  }

  /**
   * 获取所有分析结果
   */
  getAllProfiles(): MemoryProfile[] {
    return Array.from(this.profiles.values());
  }

  /**
   * 获取性能测试结果
   */
  getPerformanceTest(testName: string): PerformanceTest | null {
    return this.performanceTests.get(testName) || null;
  }

  /**
   * 获取所有性能测试结果
   */
  getAllPerformanceTests(): PerformanceTest[] {
    return Array.from(this.performanceTests.values());
  }

  /**
   * 清除分析数据
   */
  clearData(): void {
    // 停止所有活跃的分析
    this.activeProfiles.forEach((activeProfile, id) => {
      clearInterval(activeProfile.samplingTimer);
    });
    
    this.profiles.clear();
    this.activeProfiles.clear();
    this.performanceTests.clear();
    
    console.log('🧹 内存分析数据已清空');
  }

  /**
   * 导出分析报告
   */
  exportReport(profileId?: string): string {
    const profiles = profileId ? [this.getProfile(profileId)].filter(Boolean) : this.getAllProfiles();
    const tests = this.getAllPerformanceTests();
    
    const report = {
      timestamp: new Date().toISOString(),
      profiles: profiles.map(profile => ({
        ...profile,
        // 简化样本数据以减少报告大小
        samples: profile.samples.length > 100 ? 
          profile.samples.filter((_, i) => i % Math.ceil(profile.samples.length / 100) === 0) : 
          profile.samples
      })),
      performanceTests: tests,
      summary: {
        totalProfiles: profiles.length,
        totalTests: tests.length,
        avgMemoryGrowth: profiles.reduce((sum, p) => sum + p.memoryGrowth, 0) / profiles.length,
        leakDetectedTests: tests.filter(t => t.memoryLeakDetected).length
      }
    };
    
    return JSON.stringify(report, null, 2);
  }
}

// 创建全局分析器实例
export const memoryProfiler = new MemoryProfiler();

// 开发环境下的便捷方法
if (process.env.NODE_ENV === 'development') {
  (window as any).memoryProfiler = memoryProfiler;
  console.log('🔧 内存分析器已挂载到 window.memoryProfiler');
}

export default MemoryProfiler;