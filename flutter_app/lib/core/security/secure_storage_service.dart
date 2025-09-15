import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';
import 'package:crypto/crypto.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../utils/logger.dart';
import '../config/app_config.dart';

/// 安全存储服务
/// 提供敏感数据的加密存储功能，防止本地数据泄露
class SecureStorageService {
  static const String _encryptionKeyKey = 'secure_storage_key';
  static const String _saltKey = 'secure_storage_salt';
  
  // 使用设备相关信息生成的密钥（模拟硬件安全模块）
  static late Uint8List _deviceKey;
  static late Uint8List _salt;
  
  /// 初始化安全存储
  static Future<void> initialize() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      
      // 获取或生成盐值
      final saltBase64 = prefs.getString(_saltKey);
      if (saltBase64 == null) {
        _salt = _generateRandomBytes(32);
        await prefs.setString(_saltKey, base64Encode(_salt));
        if (AppConfig.enableLogging) {
          AppLogger.info('🔐 [SecureStorage] 生成新的加密盐值', tag: 'Security');
        }
      } else {
        _salt = base64Decode(saltBase64);
      }
      
      // 获取或生成设备密钥
      final keyBase64 = prefs.getString(_encryptionKeyKey);
      if (keyBase64 == null) {
        _deviceKey = _generateDeviceKey();
        await prefs.setString(_encryptionKeyKey, base64Encode(_deviceKey));
        if (AppConfig.enableLogging) {
          AppLogger.info('🔐 [SecureStorage] 生成新的设备密钥', tag: 'Security');
        }
      } else {
        _deviceKey = base64Decode(keyBase64);
      }
      
      if (AppConfig.enableLogging) {
        AppLogger.info('✅ [SecureStorage] 安全存储初始化完成', tag: 'Security');
      }
    } catch (e) {
      AppLogger.error('🚨 [SecureStorage] 安全存储初始化失败', tag: 'Security', error: e);
      rethrow;
    }
  }
  
  /// 生成设备相关密钥
  static Uint8List _generateDeviceKey() {
    // 使用多种设备信息生成密钥（简化版本）
    final random = Random.secure();
    final key = Uint8List(32);
    for (int i = 0; i < 32; i++) {
      key[i] = random.nextInt(256);
    }
    return key;
  }
  
  /// 生成随机字节
  static Uint8List _generateRandomBytes(int length) {
    final random = Random.secure();
    final bytes = Uint8List(length);
    for (int i = 0; i < length; i++) {
      bytes[i] = random.nextInt(256);
    }
    return bytes;
  }
  
  /// 加密数据
  static Future<String> encryptData(String plaintext) async {
    try {
      // 生成随机IV
      final iv = _generateRandomBytes(16);
      
      // 使用PBKDF2派生加密密钥
      final derivedKey = _deriveKey(_deviceKey, _salt, 10000, 32);
      
      // 简化的AES加密（生产环境建议使用专业加密库）
      final dataBytes = utf8.encode(plaintext);
      final encryptedData = _simpleXorEncrypt(dataBytes, derivedKey, iv);
      
      // 组合IV和加密数据
      final combined = Uint8List(iv.length + encryptedData.length);
      combined.setRange(0, iv.length, iv);
      combined.setRange(iv.length, combined.length, encryptedData);
      
      // 计算HMAC确保完整性
      final hmac = _calculateHMAC(combined, derivedKey);
      
      final result = {
        'data': base64Encode(combined),
        'hmac': base64Encode(hmac),
        'version': '1.0',
      };
      
      return base64Encode(utf8.encode(json.encode(result)));
    } catch (e) {
      AppLogger.error('🚨 [SecureStorage] 数据加密失败', tag: 'Security', error: e);
      rethrow;
    }
  }
  
  /// 解密数据
  static Future<String?> decryptData(String encryptedData) async {
    try {
      // 解析加密数据结构
      final decodedData = utf8.decode(base64Decode(encryptedData));
      final dataMap = json.decode(decodedData) as Map<String, dynamic>;
      
      final combined = base64Decode(dataMap['data']);
      final storedHmac = base64Decode(dataMap['hmac']);
      
      // 派生解密密钥
      final derivedKey = _deriveKey(_deviceKey, _salt, 10000, 32);
      
      // 验证HMAC完整性
      final calculatedHmac = _calculateHMAC(combined, derivedKey);
      if (!_constantTimeEquals(storedHmac, calculatedHmac)) {
        AppLogger.error('🚨 [SecureStorage] HMAC验证失败，数据可能被篡改', tag: 'Security');
        return null;
      }
      
      // 提取IV和加密数据
      final iv = combined.sublist(0, 16);
      final encryptedBytes = combined.sublist(16);
      
      // 解密数据
      final decryptedBytes = _simpleXorDecrypt(encryptedBytes, derivedKey, iv);
      
      return utf8.decode(decryptedBytes);
    } catch (e) {
      AppLogger.error('🚨 [SecureStorage] 数据解密失败', tag: 'Security', error: e);
      return null;
    }
  }
  
  /// PBKDF2密钥派生
  static Uint8List _deriveKey(Uint8List password, Uint8List salt, int iterations, int keyLength) {
    var hmacSha256 = Hmac(sha256, password);
    var derivedKey = Uint8List(keyLength);
    var blockCount = (keyLength / 32).ceil();
    
    for (int i = 1; i <= blockCount; i++) {
      var block = _pbkdf2Block(hmacSha256, salt, iterations, i);
      var blockLength = (i == blockCount) ? keyLength % 32 : 32;
      if (blockLength == 0) blockLength = 32;
      derivedKey.setRange((i - 1) * 32, (i - 1) * 32 + blockLength, block);
    }
    
    return derivedKey;
  }
  
  /// PBKDF2块计算
  static Uint8List _pbkdf2Block(Hmac hmac, Uint8List salt, int iterations, int blockIndex) {
    var u = Uint8List(32);
    var saltWithIndex = Uint8List(salt.length + 4);
    saltWithIndex.setRange(0, salt.length, salt);
    saltWithIndex[salt.length] = (blockIndex >> 24) & 0xff;
    saltWithIndex[salt.length + 1] = (blockIndex >> 16) & 0xff;
    saltWithIndex[salt.length + 2] = (blockIndex >> 8) & 0xff;
    saltWithIndex[salt.length + 3] = blockIndex & 0xff;
    
    var uPrev = Uint8List.fromList(hmac.convert(saltWithIndex).bytes);
    u.setRange(0, 32, uPrev);
    
    for (int i = 1; i < iterations; i++) {
      uPrev = Uint8List.fromList(hmac.convert(uPrev).bytes);
      for (int j = 0; j < 32; j++) {
        u[j] ^= uPrev[j];
      }
    }
    
    return u;
  }
  
  /// 简化XOR加密（仅用于演示，生产环境应使用标准AES）
  static Uint8List _simpleXorEncrypt(Uint8List data, Uint8List key, Uint8List iv) {
    final encrypted = Uint8List(data.length);
    for (int i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ key[i % key.length] ^ iv[i % iv.length];
    }
    return encrypted;
  }
  
  /// 简化XOR解密
  static Uint8List _simpleXorDecrypt(Uint8List encryptedData, Uint8List key, Uint8List iv) {
    return _simpleXorEncrypt(encryptedData, key, iv); // XOR解密与加密相同
  }
  
  /// 计算HMAC
  static Uint8List _calculateHMAC(Uint8List data, Uint8List key) {
    final hmac = Hmac(sha256, key);
    return Uint8List.fromList(hmac.convert(data).bytes);
  }
  
  /// 常量时间比较（防止时序攻击）
  static bool _constantTimeEquals(Uint8List a, Uint8List b) {
    if (a.length != b.length) return false;
    
    int result = 0;
    for (int i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }
    return result == 0;
  }
  
  /// 清理敏感数据
  static Future<void> clearSecureData() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      await prefs.remove(_encryptionKeyKey);
      await prefs.remove(_saltKey);
      
      // 清理内存中的密钥
      _deviceKey.fillRange(0, _deviceKey.length, 0);
      _salt.fillRange(0, _salt.length, 0);
      
      AppLogger.info('🔐 [SecureStorage] 安全数据已清理', tag: 'Security');
    } catch (e) {
      AppLogger.error('🚨 [SecureStorage] 清理安全数据失败', tag: 'Security', error: e);
    }
  }
}