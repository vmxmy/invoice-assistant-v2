#!/bin/bash

# 批量替换DesignConstants常用值的脚本

# 常见的间距替换
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.spacingXS/4.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.spacingS/8.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.spacingM/12.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.spacingL/16.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.spacingXL/24.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.spacingXXL/32.0/g' {} \;

# 圆角替换
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.radiusSmall/8.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.radiusMedium/12.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.radiusLarge/16.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.radiusXLarge/24.0/g' {} \;

# 字体大小替换
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.fontSizeCaption/12.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.fontSizeBody/14.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.fontSizeSubtitle/16.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.fontSizeTitle/17.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.fontSizeHeadline/22.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.fontSizeLargeTitle/34.0/g' {} \;

# 图标大小替换
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.iconSizeXS/12.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.iconSizeS/16.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.iconSizeM/20.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.iconSizeL/24.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.iconSizeXL/32.0/g' {} \;

# 按钮高度替换
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.buttonHeightSmall/32.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.buttonHeightMedium/44.0/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.buttonHeightLarge/50.0/g' {} \;

# 动画时长替换
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.animationFast/const Duration(milliseconds: 200)/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.animationNormal/const Duration(milliseconds: 300)/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.animationSlow/const Duration(milliseconds: 500)/g' {} \;

# 透明度替换
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.opacityDisabled/0.3/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.opacitySecondary/0.6/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.opacityTertiary/0.4/g' {} \;
find lib -name "*.dart" -exec sed -i.bak 's/DesignConstants\.opacityOverlay/0.08/g' {} \;

echo "批量替换完成"
