import React, { useState } from 'react';
import { X, ArrowLeft, ArrowRight } from 'lucide-react';
import ProviderSelector from '../ui/ProviderSelector';
import AuthConfigForm from '../forms/AuthConfigForm';
import { LoadingButton } from '../ui/LoadingButton';

interface AddAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (accountData: {
    provider: string;
    email: string;
    credential: string;
    displayName?: string;
  }) => void;
  onTestConnection?: (config: {
    provider: string;
    email: string;
    credential: string;
  }) => void;
  isLoading?: boolean;
  isTesting?: boolean;
  testResult?: {
    success: boolean;
    message?: string;
    error?: string;
  };
}

const AddAccountModal: React.FC<AddAccountModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onTestConnection,
  isLoading = false,
  isTesting = false,
  testResult,
}) => {
  const [currentStep, setCurrentStep] = useState<'provider' | 'config'>('provider');
  const [selectedProvider, setSelectedProvider] = useState<string>('');

  // 重置模态框状态
  const resetModal = () => {
    setCurrentStep('provider');
    setSelectedProvider('');
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleProviderSelect = (provider: string) => {
    setSelectedProvider(provider);
  };

  const handleNextStep = () => {
    if (currentStep === 'provider' && selectedProvider) {
      setCurrentStep('config');
    }
  };

  const handlePrevStep = () => {
    if (currentStep === 'config') {
      setCurrentStep('provider');
    }
  };

  const handleFormSubmit = (configData: {
    email: string;
    credential: string;
    displayName?: string;
  }) => {
    onSave({
      provider: selectedProvider,
      ...configData,
    });
  };

  const handleTestConnection = (configData: {
    email: string;
    credential: string;
  }) => {
    if (onTestConnection) {
      onTestConnection({
        provider: selectedProvider,
        ...configData,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* 模态框内容 */}
      <div className="relative bg-base-100 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-base-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            {currentStep === 'config' && (
              <button
                onClick={handlePrevStep}
                className="btn btn-ghost btn-sm btn-circle"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-semibold text-base-content">
                添加邮箱账户
              </h2>
              <p className="text-sm text-base-content/70">
                {currentStep === 'provider' ? '选择邮箱提供商' : '配置账户信息'}
              </p>
            </div>
          </div>
          
          <button
            onClick={handleClose}
            className="btn btn-ghost btn-sm btn-circle"
            disabled={isLoading}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 步骤指示器 */}
        <div className="px-6 py-4 bg-base-50 border-b border-base-200 flex-shrink-0">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'provider' 
                  ? 'bg-primary text-primary-content' 
                  : 'bg-success text-success-content'
              }`}>
                1
              </div>
              <span className={`text-sm ${
                currentStep === 'provider' ? 'text-primary font-medium' : 'text-success'
              }`}>
                选择提供商
              </span>
            </div>
            
            <div className={`flex-1 h-0.5 ${
              currentStep === 'config' ? 'bg-success' : 'bg-base-300'
            }`} />
            
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep === 'config' 
                  ? 'bg-primary text-primary-content' 
                  : 'bg-base-300 text-base-content/50'
              }`}>
                2
              </div>
              <span className={`text-sm ${
                currentStep === 'config' ? 'text-primary font-medium' : 'text-base-content/50'
              }`}>
                配置账户
              </span>
            </div>
          </div>
        </div>

        {/* 主要内容 */}
        <div className="p-6 overflow-y-auto flex-1">
          {currentStep === 'provider' && (
            <ProviderSelector
              selectedProvider={selectedProvider}
              onProviderChange={handleProviderSelect}
            />
          )}

          {currentStep === 'config' && selectedProvider && (
            <AuthConfigForm
              provider={selectedProvider}
              onSubmit={handleFormSubmit}
              onTestConnection={handleTestConnection}
              isLoading={isLoading}
              isTesting={isTesting}
              testResult={testResult}
            />
          )}
        </div>

        {/* 底部操作 */}
        <div className="flex items-center justify-between p-6 border-t border-base-200 flex-shrink-0">
          <div className="text-sm text-base-content/70">
            {currentStep === 'provider' && '选择您要配置的邮箱类型'}
            {currentStep === 'config' && '填写账户信息并测试连接'}
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handleClose}
              className="btn btn-ghost"
              disabled={isLoading}
            >
              取消
            </button>
            
            {currentStep === 'provider' && (
              <LoadingButton
                variant="primary"
                onClick={handleNextStep}
                disabled={!selectedProvider}
                icon={<ArrowRight className="w-4 h-4" />}
              >
                下一步
              </LoadingButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddAccountModal;