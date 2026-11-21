class DooraTask {
  const DooraTask({
    required this.id, required this.title, required this.description,
    required this.category, required this.budget, required this.location,
    required this.time, required this.owner, required this.offers,
  });

  final String id, title, description, category, location, time, owner;
  final num budget;
  final int offers;

  factory DooraTask.fromJson(Map<String, dynamic> json) => DooraTask(
    id: json['id']?.toString() ?? '',
    title: json['title']?.toString() ?? 'İsimsiz ilan',
    description: json['description']?.toString() ?? '',
    category: json['category']?.toString() ?? 'Diğer',
    budget: _number(json['budget']),
    location: json['location']?.toString() ?? '',
    time: json['time']?.toString() ?? 'Yeni ilan',
    owner: json['owner']?.toString() ?? 'DOORA üyesi',
    offers: _number(json['offers']).toInt(),
  );

  static num _number(dynamic value) {
    if (value is num) return value;
    return num.tryParse(value?.toString() ?? '') ?? 0;
  }

  String get formattedBudget => budget.toStringAsFixed(budget % 1 == 0 ? 0 : 2) + ' ₺';
}
