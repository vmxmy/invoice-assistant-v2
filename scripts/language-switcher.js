// Language switcher functionality
const translations = {
    zh: {
        // Navigation
        'nav-home': '主页',
        'nav-privacy': '隐私政策',
        'nav-terms': '服务条款',
        'lang-switch': 'English',
        
        // Index page
        'hero-title': '智能发票管理系统',
        'hero-subtitle': 'Invoice Management System',
        'hero-description': '自动化处理、智能识别、高效管理您的电子发票',
        
        'feature-title': '功能特性',
        'feature-1-title': '智能识别',
        'feature-1-desc': '支持多种格式的发票自动识别，包括增值税发票、火车票、餐饮发票等',
        'feature-2-title': '批量处理',
        'feature-2-desc': '一键批量导入和处理多张发票，大幅提升工作效率',
        'feature-3-title': '邮件集成',
        'feature-3-desc': '自动从邮箱获取发票附件，实现全自动化处理流程',
        'feature-4-title': '数据导出',
        'feature-4-desc': '支持多种格式导出，方便财务报表制作和数据分析',
        'feature-5-title': '安全可靠',
        'feature-5-desc': '企业级数据加密，确保您的财务信息安全',
        'feature-6-title': '云端同步',
        'feature-6-desc': '支持多设备访问，随时随地管理您的发票',
        
        'tech-title': '技术架构',
        'tech-subtitle': '采用现代化技术栈，确保系统稳定高效',
        'tech-1': 'Python Flask 后端框架',
        'tech-2': 'Supabase 云数据库',
        'tech-3': 'OCR 智能识别技术',
        'tech-4': 'RESTful API 设计',
        'tech-5': '响应式前端设计',
        'tech-6': '100% 发票识别成功率',
        
        'footer-text': '© 2024 智能发票管理系统. 保留所有权利.',
        
        // Privacy Policy
        'privacy-title': '隐私政策',
        'privacy-updated': '最后更新：2024年1月',
        
        // Terms of Service
        'terms-title': '服务条款',
        'terms-updated': '最后更新：2024年1月'
    },
    
    en: {
        // Navigation
        'nav-home': 'Home',
        'nav-privacy': 'Privacy Policy',
        'nav-terms': 'Terms of Service',
        'lang-switch': '中文',
        
        // Index page
        'hero-title': 'Smart Invoice Management System',
        'hero-subtitle': '',
        'hero-description': 'Automated processing, intelligent recognition, and efficient management of your electronic invoices',
        
        'feature-title': 'Features',
        'feature-1-title': 'Smart Recognition',
        'feature-1-desc': 'Supports automatic recognition of various invoice formats including VAT invoices, train tickets, and restaurant receipts',
        'feature-2-title': 'Batch Processing',
        'feature-2-desc': 'One-click batch import and processing of multiple invoices, greatly improving work efficiency',
        'feature-3-title': 'Email Integration',
        'feature-3-desc': 'Automatically retrieve invoice attachments from email, achieving fully automated processing',
        'feature-4-title': 'Data Export',
        'feature-4-desc': 'Support multiple export formats for easy financial reporting and data analysis',
        'feature-5-title': 'Secure & Reliable',
        'feature-5-desc': 'Enterprise-grade data encryption ensures the security of your financial information',
        'feature-6-title': 'Cloud Sync',
        'feature-6-desc': 'Multi-device access support, manage your invoices anytime, anywhere',
        
        'tech-title': 'Technical Architecture',
        'tech-subtitle': 'Built with modern technology stack for stability and efficiency',
        'tech-1': 'Python Flask Backend Framework',
        'tech-2': 'Supabase Cloud Database',
        'tech-3': 'OCR Smart Recognition Technology',
        'tech-4': 'RESTful API Design',
        'tech-5': 'Responsive Frontend Design',
        'tech-6': '100% Invoice Recognition Success Rate',
        
        'footer-text': '© 2024 Smart Invoice Management System. All rights reserved.',
        
        // Privacy Policy
        'privacy-title': 'Privacy Policy',
        'privacy-updated': 'Last Updated: January 2024',
        
        // Terms of Service
        'terms-title': 'Terms of Service',
        'terms-updated': 'Last Updated: January 2024'
    }
};

// Get current language from localStorage or default to Chinese
let currentLang = localStorage.getItem('language') || 'zh';

// Apply translations
function applyTranslations(lang) {
    const elements = document.querySelectorAll('[data-i18n]');
    elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[lang][key]) {
            element.textContent = translations[lang][key];
        }
    });
    
    // Update HTML lang attribute
    document.documentElement.lang = lang;
    
    // Save preference
    localStorage.setItem('language', lang);
    currentLang = lang;
}

// Toggle language
function toggleLanguage() {
    const newLang = currentLang === 'zh' ? 'en' : 'zh';
    applyTranslations(newLang);
    
    // Update URLs for language-specific pages
    updateNavigationUrls(newLang);
}

// Update navigation URLs based on language
function updateNavigationUrls(lang) {
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (href) {
            // Remove language suffix if exists
            let basePath = href.replace('-en.html', '.html').replace('.html', '');
            
            // Add language suffix for English
            if (lang === 'en' && basePath !== 'index') {
                link.setAttribute('href', basePath + '-en.html');
            } else {
                link.setAttribute('href', basePath + '.html');
            }
        }
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    applyTranslations(currentLang);
    
    // Add click handler to language switch button
    const langButton = document.getElementById('lang-switch');
    if (langButton) {
        langButton.addEventListener('click', toggleLanguage);
    }
});