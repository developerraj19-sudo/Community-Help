import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  final ApiService _api = ApiService();
  
  bool _isLoading = true;
  bool _isAuthenticated = false;
  Map<String, dynamic>? _user;

  bool get isLoading => _isLoading;
  bool get isAuthenticated => _isAuthenticated;
  Map<String, dynamic>? get user => _user;

  Future<void> checkAuthStatus() async {
    _isLoading = true;
    notifyListeners();

    try {
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString('auth_token');
      
      if (token != null) {
        final response = await _api.get('/auth/me');
        if (response['success'] == true) {
          _isAuthenticated = true;
          _user = response['user'];
        } else {
          await _clearAuth();
        }
      }
    } catch (e) {
      await _clearAuth();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> _clearAuth() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('auth_token');
    _isAuthenticated = false;
    _user = null;
  }

  Future<void> sendOTP(String phoneNumber) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.post('/auth/send-otp', {
        'phone': phoneNumber,
      });

      if (response['success'] != true) {
        throw Exception(response['message'] ?? 'Failed to send OTP');
      }
    } catch (e) {
      throw Exception('Failed to send OTP: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> verifyOTP(String smsCode, String phoneNumber) async {
    _isLoading = true;
    notifyListeners();

    try {
      final response = await _api.post('/auth/verify-otp', {
        'phone': phoneNumber,
        'otp': smsCode,
      });

      if (response['success'] == true) {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString('auth_token', response['token']);
        _isAuthenticated = true;
        _user = response['user'];
      } else {
        throw Exception(response['message'] ?? 'Invalid OTP');
      }
    } catch (e) {
      throw Exception('Invalid OTP: $e');
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<void> logout() async {
    await _clearAuth();
    notifyListeners();
  }
}
