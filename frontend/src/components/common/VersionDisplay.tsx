import React, { useState } from 'react';
import { getVersionInfo, getShortVersion, getFullVersionString } from '../../config/version';

interface VersionDisplayProps {
  showFull?: boolean;
  className?: string;
  position?: 'footer' | 'corner' | 'inline';
}

export const VersionDisplay: React.FC<VersionDisplayProps> = ({ 
  showFull = false, 
  className = '',
  position = 'footer'
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const versionInfo = getVersionInfo();
  
  const baseClasses = {
    footer: 'text-xs text-base-content/60 hover:text-base-content/80 transition-colors cursor-pointer',
    corner: 'fixed bottom-4 right-4 text-xs bg-base-200 px-2 py-1 rounded-full shadow-sm hover:shadow-md transition-all cursor-pointer z-50',
    inline: 'text-sm text-base-content/70 hover:text-base-content/90 transition-colors cursor-pointer'
  };

  const toggleDetails = () => {
    setShowDetails(!showDetails);
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(getFullVersionString());
  };

  if (position === 'corner') {
    return (
      <div className={`${baseClasses[position]} ${className}`} onClick={toggleDetails}>
        {showDetails ? (
          <div className="text-right">
            <div className="font-medium">发票助手 {getShortVersion()}</div>
            <div className="text-xs opacity-75">构建: {new Date(versionInfo.buildTime).toLocaleString('zh-CN')}</div>
            <div className="text-xs opacity-75">Commit: {versionInfo.commitHash.substring(0, 7)}</div>
            <div className="text-xs opacity-75 mt-1">
              <button 
                onClick={handleCopy}
                className="hover:text-primary transition-colors"
                title="复制版本信息"
              >
                📋 复制
              </button>
            </div>
          </div>
        ) : (
          <span>{getShortVersion()}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`${baseClasses[position]} ${className}`} onClick={toggleDetails}>
      {showFull || showDetails ? (
        <div className="flex items-center gap-2">
          <span>发票助手 {getFullVersionString()}</span>
          <button 
            onClick={handleCopy}
            className="opacity-50 hover:opacity-100 transition-opacity"
            title="复制版本信息"
          >
            📋
          </button>
        </div>
      ) : (
        <span>{getShortVersion()}</span>
      )}
    </div>
  );
};

// 版本信息模态框组件
export const VersionModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ 
  isOpen, 
  onClose 
}) => {
  const versionInfo = getVersionInfo();
  
  if (!isOpen) return null;

  return (
    <div className="modal modal-open">
      <div className="modal-box">
        <h3 className="font-bold text-lg mb-4">版本信息</h3>
        
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="font-medium">应用版本:</span>
            <span>v{versionInfo.version}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">构建时间:</span>
            <span>{new Date(versionInfo.buildTime).toLocaleString('zh-CN')}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">提交哈希:</span>
            <code className="text-sm bg-base-200 px-2 py-1 rounded">
              {versionInfo.commitHash}
            </code>
          </div>
          
          <div className="flex justify-between">
            <span className="font-medium">运行环境:</span>
            <span className={`badge ${
              versionInfo.environment === 'production' ? 'badge-success' : 'badge-warning'
            }`}>
              {versionInfo.environment}
            </span>
          </div>
        </div>
        
        <div className="modal-action">
          <button 
            onClick={() => {
              navigator.clipboard.writeText(getFullVersionString());
            }}
            className="btn btn-outline btn-sm"
          >
            复制版本信息
          </button>
          <button onClick={onClose} className="btn btn-sm">
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};