import 'package:freezed_annotation/freezed_annotation.dart';

part 'checklist.freezed.dart';
part 'checklist.g.dart';

@freezed
class ChecklistItem with _$ChecklistItem {
  const factory ChecklistItem({
    required int id,
    required int templateId,
    required int sequence,
    required String label,
    String? description,
    @Default(false) bool isCritical,
  }) = _ChecklistItem;

  factory ChecklistItem.fromJson(Map<String, dynamic> json) =>
      _$ChecklistItemFromJson(json);
}

@freezed
class ChecklistTemplate with _$ChecklistTemplate {
  const factory ChecklistTemplate({
    required int id,
    required String name,
    String? droneModel,
    @Default([]) List<ChecklistItem> items,
  }) = _ChecklistTemplate;

  factory ChecklistTemplate.fromJson(Map<String, dynamic> json) =>
      _$ChecklistTemplateFromJson(json);
}

@freezed
class ChecklistRun with _$ChecklistRun {
  const factory ChecklistRun({
    required int id,
    required int templateId,
    required int droneId,
    required List<int> passedItemIds,
    required List<int> failedItemIds,
    @Default(false) bool allPassed,
    String? performedAt,
  }) = _ChecklistRun;

  factory ChecklistRun.fromJson(Map<String, dynamic> json) =>
      _$ChecklistRunFromJson(json);
}
