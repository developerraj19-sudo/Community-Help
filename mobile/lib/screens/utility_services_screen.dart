import 'package:flutter/material.dart';
import '../services/api_service.dart';

class UtilityServicesScreen extends StatefulWidget {
  const UtilityServicesScreen({super.key});

  @override
  State<UtilityServicesScreen> createState() => _UtilityServicesScreenState();
}

class _UtilityServicesScreenState extends State<UtilityServicesScreen> {
  final ApiService _api = ApiService();
  List<dynamic> _providers = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchProviders();
  }

  Future<void> _fetchProviders() async {
    try {
      final response = await _api.get('/providers/nearby?lat=28.6139&lng=77.2090'); // Mock location
      if (response['success'] == true) {
        setState(() {
          _providers = response['data'] ?? [];
        });
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to load providers: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _requestService(String providerId, String category) async {
    try {
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (ctx) => const Center(child: CircularProgressIndicator()),
      );

      final response = await _api.post('/services/request', {
        'providerId': providerId,
        'category': category,
        'location': {'lat': 28.6139, 'lng': 77.2090},
        'address': 'Current Location',
        'notes': 'Requested from Mobile App',
      });

      if (mounted) Navigator.pop(context); // hide loading

      if (response['success'] == true && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Service requested successfully!'), backgroundColor: Colors.green),
        );
      }
    } catch (e) {
      if (mounted) {
        Navigator.pop(context); // hide loading
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed: $e'), backgroundColor: Colors.red),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Utility Services')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _providers.isEmpty
              ? const Center(child: Text('No providers found nearby'))
              : ListView.builder(
                  itemCount: _providers.length,
                  padding: const EdgeInsets.all(16),
                  itemBuilder: (context, index) {
                    final provider = _providers[index];
                    return Card(
                      margin: const EdgeInsets.only(bottom: 16),
                      child: Padding(
                        padding: const EdgeInsets.all(16.0),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    provider['user']?['name'] ?? 'Unknown',
                                    style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.blue[100],
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Text(
                                    provider['serviceCategory']?.toUpperCase() ?? 'SERVICE',
                                    style: TextStyle(color: Colors.blue[900], fontSize: 12, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                const Icon(Icons.star, color: Colors.amber, size: 20),
                                const SizedBox(width: 4),
                                Text('${provider['rating']?.toStringAsFixed(1) ?? 'N/A'} (${provider['reviews']?.length ?? 0} reviews)'),
                                const SizedBox(width: 16),
                                const Icon(Icons.work, color: Colors.grey, size: 20),
                                const SizedBox(width: 4),
                                Text('${provider['experience'] ?? 0} yrs exp'),
                              ],
                            ),
                            const SizedBox(height: 16),
                            SizedBox(
                              width: double.infinity,
                              child: ElevatedButton(
                                onPressed: provider['isAvailable'] == true 
                                  ? () => _requestService(provider['_id'], provider['serviceCategory'])
                                  : null,
                                child: Text(provider['isAvailable'] == true ? 'Book Now' : 'Currently Unavailable'),
                              ),
                            )
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}
