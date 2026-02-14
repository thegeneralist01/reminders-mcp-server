import Foundation
import EventKit

enum HelperError: Error {
  case message(String)
}

struct ErrorEnvelope: Encodable {
  let ok = false
  let error: String
}

struct SuccessEnvelope<T: Encodable>: Encodable {
  let ok = true
  let result: T
}

struct ReminderRecord: Encodable {
  let id: String
  let name: String
  let body: String?
  let completed: Bool
  let completionDate: String?
  let dueDate: String?
  let allDayDueDate: String?
  let remindMeDate: String?
  let priority: Int
  let creationDate: String?
  let modificationDate: String?
  let listName: String
}

struct ReminderListRecord: Encodable {
  let id: String
  let name: String
}

struct EmptyResult: Encodable {
  let success = true
}

struct ListRemindersResult: Encodable {
  let total: Int
  let reminders: [ReminderRecord]
}

struct CountResult: Encodable {
  let count: Int
}

struct CreateIdResult: Encodable {
  let id: String
}

struct ListRemindersPayload: Decodable {
  let listName: String?
  let completed: Bool?
  let limit: Int?
  let offset: Int?
}

struct CountRemindersPayload: Decodable {
  let listName: String?
  let completed: Bool?
}

struct CreateReminderPayload: Decodable {
  let name: String
  let listName: String
  let body: String?
  let dueDate: String?
  let allDayDueDate: String?
  let remindMeDate: String?
  let priority: Int?
}

struct UpdateReminderPayload: Decodable {
  let listName: String
  let reminderName: String
  let newName: String?
  let body: String?
  let dueDate: String?
  let allDayDueDate: String?
  let remindMeDate: String?
  let priority: Int?
  let completed: Bool?
}

struct DeleteReminderPayload: Decodable {
  let listName: String
  let reminderName: String
}

struct CreateListPayload: Decodable {
  let name: String
}

struct DeleteListPayload: Decodable {
  let name: String
}

let isoFormatterWithFractionalSeconds: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  formatter.timeZone = TimeZone(secondsFromGMT: 0)
  return formatter
}()

let isoFormatterWithoutFractionalSeconds: ISO8601DateFormatter = {
  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime]
  formatter.timeZone = TimeZone(secondsFromGMT: 0)
  return formatter
}()

let allDayDateFormatter: DateFormatter = {
  let formatter = DateFormatter()
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = TimeZone(secondsFromGMT: 0)
  formatter.dateFormat = "yyyy-MM-dd"
  return formatter
}()

func emitJSON<T: Encodable>(_ value: T) {
  let encoder = JSONEncoder()
  encoder.outputFormatting = []

  do {
    let data = try encoder.encode(value)
    if let string = String(data: data, encoding: .utf8) {
      print(string)
    } else {
      print("{\"ok\":false,\"error\":\"Failed to serialize response\"}")
    }
  } catch {
    print("{\"ok\":false,\"error\":\"Failed to encode response: \(error.localizedDescription)\"}")
  }
}

func parseISODate(_ value: String) -> Date? {
  if let parsed = isoFormatterWithFractionalSeconds.date(from: value) {
    return parsed
  }
  if let parsed = isoFormatterWithoutFractionalSeconds.date(from: value) {
    return parsed
  }
  return nil
}

func isoString(_ value: Date?) -> String? {
  guard let value else { return nil }
  return isoFormatterWithFractionalSeconds.string(from: value)
}

func dateComponentsFromISO(_ value: String) throws -> DateComponents {
  guard let date = parseISODate(value) else {
    throw HelperError.message("Invalid ISO 8601 date: \(value)")
  }

  let calendar = Calendar.current
  return calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)
}

func dateComponentsFromAllDay(_ value: String) throws -> DateComponents {
  guard let date = allDayDateFormatter.date(from: value) else {
    throw HelperError.message("Invalid all-day date format (expected YYYY-MM-DD): \(value)")
  }

  let calendar = Calendar.current
  return calendar.dateComponents([.year, .month, .day], from: date)
}

func dueDate(from reminder: EKReminder) -> Date? {
  guard let components = reminder.dueDateComponents else {
    return nil
  }
  return Calendar.current.date(from: components)
}

func isAllDayDueDate(_ reminder: EKReminder) -> Bool {
  guard let components = reminder.dueDateComponents else {
    return false
  }
  return components.hour == nil && components.minute == nil && components.second == nil
}

func remindMeDate(from reminder: EKReminder) -> Date? {
  guard let alarms = reminder.alarms else {
    return nil
  }
  return alarms.compactMap { $0.absoluteDate }.sorted().first
}

func mapReminder(_ reminder: EKReminder) -> ReminderRecord {
  let due = dueDate(from: reminder)
  let allDayDue = isAllDayDueDate(reminder) ? due : nil

  return ReminderRecord(
    id: reminder.calendarItemIdentifier,
    name: reminder.title,
    body: reminder.notes,
    completed: reminder.isCompleted,
    completionDate: isoString(reminder.completionDate),
    dueDate: isoString(due),
    allDayDueDate: isoString(allDayDue),
    remindMeDate: isoString(remindMeDate(from: reminder)),
    priority: reminder.priority,
    creationDate: isoString(reminder.creationDate),
    modificationDate: isoString(reminder.lastModifiedDate),
    listName: reminder.calendar.title
  )
}

func sortReminders(_ reminders: [EKReminder]) -> [EKReminder] {
  reminders.sorted { lhs, rhs in
    let lhsDue = dueDate(from: lhs)
    let rhsDue = dueDate(from: rhs)

    switch (lhsDue, rhsDue) {
    case let (l?, r?):
      if l != r { return l < r }
    case (nil, _?):
      return false
    case (_?, nil):
      return true
    case (nil, nil):
      break
    }

    let lhsMod = lhs.lastModifiedDate ?? lhs.creationDate ?? Date.distantPast
    let rhsMod = rhs.lastModifiedDate ?? rhs.creationDate ?? Date.distantPast
    if lhsMod != rhsMod {
      return lhsMod > rhsMod
    }

    return lhs.title.localizedCaseInsensitiveCompare(rhs.title) == .orderedAscending
  }
}

func ensureAccess(_ store: EKEventStore) throws {
  let status = EKEventStore.authorizationStatus(for: .reminder)
  switch status {
  case .fullAccess:
    return
  case .denied, .restricted:
    throw HelperError.message("Reminders access denied. Grant full access in System Settings > Privacy & Security > Calendars")
  case .notDetermined, .writeOnly:
    break
  @unknown default:
    break
  }

  let semaphore = DispatchSemaphore(value: 0)
  var granted = false
  var requestError: Error?

  store.requestFullAccessToReminders { value, error in
    granted = value
    requestError = error
    semaphore.signal()
  }

  if semaphore.wait(timeout: .now() + .seconds(20)) == .timedOut {
    throw HelperError.message("Timed out waiting for Reminders permission response")
  }

  if let requestError {
    throw requestError
  }

  if !granted {
    throw HelperError.message("Reminders permission was not granted")
  }
}

func allReminderCalendars(_ store: EKEventStore) -> [EKCalendar] {
  store.calendars(for: .reminder)
}

func calendarByName(_ name: String, calendars: [EKCalendar]) -> EKCalendar? {
  calendars.first { $0.title == name }
}

func fetchReminders(_ store: EKEventStore, calendars: [EKCalendar]?) throws -> [EKReminder] {
  let predicate = store.predicateForReminders(in: calendars)
  let semaphore = DispatchSemaphore(value: 0)
  var fetched: [EKReminder] = []

  store.fetchReminders(matching: predicate) { reminders in
    fetched = reminders ?? []
    semaphore.signal()
  }

  if semaphore.wait(timeout: .now() + .seconds(55)) == .timedOut {
    throw HelperError.message("Timed out while fetching reminders from EventKit")
  }

  return fetched
}

func parsePayload<T: Decodable>(_ type: T.Type, from json: String?) throws -> T {
  let raw = json ?? "{}"
  let data = Data(raw.utf8)
  return try JSONDecoder().decode(T.self, from: data)
}

func selectCalendars(listName: String?, allCalendars: [EKCalendar]) throws -> [EKCalendar]? {
  guard let listName else {
    return nil
  }

  guard let calendar = calendarByName(listName, calendars: allCalendars) else {
    throw HelperError.message("List '\(listName)' not found")
  }

  return [calendar]
}

func operationListLists(_ store: EKEventStore) throws -> [ReminderListRecord] {
  let calendars = allReminderCalendars(store)
  return calendars.map { calendar in
    ReminderListRecord(id: calendar.calendarIdentifier, name: calendar.title)
  }
}

func operationListReminders(_ store: EKEventStore, payload: ListRemindersPayload) throws -> ListRemindersResult {
  let calendars = allReminderCalendars(store)
  let selectedCalendars = try selectCalendars(listName: payload.listName, allCalendars: calendars)

  var reminders = try fetchReminders(store, calendars: selectedCalendars)

  if let completed = payload.completed {
    reminders = reminders.filter { $0.isCompleted == completed }
  }

  reminders = sortReminders(reminders)
  let total = reminders.count

  let safeOffset = max(0, payload.offset ?? 0)
  let safeLimit = max(1, payload.limit ?? total)

  let paged = Array(reminders.dropFirst(safeOffset).prefix(safeLimit))
  let mapped = paged.map(mapReminder)

  return ListRemindersResult(total: total, reminders: mapped)
}

func operationCountReminders(_ store: EKEventStore, payload: CountRemindersPayload) throws -> CountResult {
  let calendars = allReminderCalendars(store)
  let selectedCalendars = try selectCalendars(listName: payload.listName, allCalendars: calendars)

  var reminders = try fetchReminders(store, calendars: selectedCalendars)
  if let completed = payload.completed {
    reminders = reminders.filter { $0.isCompleted == completed }
  }

  return CountResult(count: reminders.count)
}

func operationCreateReminder(_ store: EKEventStore, payload: CreateReminderPayload) throws -> CreateIdResult {
  let calendars = allReminderCalendars(store)
  guard let calendar = calendarByName(payload.listName, calendars: calendars) else {
    throw HelperError.message("List '\(payload.listName)' not found")
  }

  if payload.name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
    throw HelperError.message("Reminder name cannot be empty")
  }

  let reminder = EKReminder(eventStore: store)
  reminder.calendar = calendar
  reminder.title = payload.name

  if let body = payload.body {
    reminder.notes = body
  }

  if let dueDate = payload.dueDate {
    reminder.dueDateComponents = try dateComponentsFromISO(dueDate)
  }

  if let allDayDueDate = payload.allDayDueDate {
    reminder.dueDateComponents = try dateComponentsFromAllDay(allDayDueDate)
  }

  if let remindMeDate = payload.remindMeDate {
    guard let absoluteDate = parseISODate(remindMeDate) else {
      throw HelperError.message("Invalid ISO 8601 remindMeDate: \(remindMeDate)")
    }
    reminder.alarms = [EKAlarm(absoluteDate: absoluteDate)]
  }

  if let priority = payload.priority {
    reminder.priority = priority
  }

  try store.save(reminder, commit: true)
  return CreateIdResult(id: reminder.calendarItemIdentifier)
}

func locateReminderByName(store: EKEventStore, listName: String, reminderName: String) throws -> EKReminder {
  let calendars = allReminderCalendars(store)
  guard let calendar = calendarByName(listName, calendars: calendars) else {
    throw HelperError.message("List '\(listName)' not found")
  }

  let reminders = try fetchReminders(store, calendars: [calendar])
  guard let reminder = reminders.first(where: { $0.title == reminderName }) else {
    throw HelperError.message("Reminder '\(reminderName)' not found in list '\(listName)'")
  }

  return reminder
}

func operationUpdateReminder(_ store: EKEventStore, payload: UpdateReminderPayload) throws -> EmptyResult {
  if payload.newName == nil,
     payload.body == nil,
     payload.dueDate == nil,
     payload.allDayDueDate == nil,
     payload.remindMeDate == nil,
     payload.priority == nil,
     payload.completed == nil {
    throw HelperError.message("No updates provided")
  }

  let reminder = try locateReminderByName(store: store, listName: payload.listName, reminderName: payload.reminderName)

  if let newName = payload.newName {
    reminder.title = newName
  }

  if let body = payload.body {
    reminder.notes = body
  }

  if let dueDate = payload.dueDate {
    reminder.dueDateComponents = try dateComponentsFromISO(dueDate)
  }

  if let allDayDueDate = payload.allDayDueDate {
    reminder.dueDateComponents = try dateComponentsFromAllDay(allDayDueDate)
  }

  if let remindMeDate = payload.remindMeDate {
    guard let absoluteDate = parseISODate(remindMeDate) else {
      throw HelperError.message("Invalid ISO 8601 remindMeDate: \(remindMeDate)")
    }
    reminder.alarms = [EKAlarm(absoluteDate: absoluteDate)]
  }

  if let priority = payload.priority {
    reminder.priority = priority
  }

  if let completed = payload.completed {
    reminder.isCompleted = completed
    reminder.completionDate = completed ? Date() : nil
  }

  try store.save(reminder, commit: true)
  return EmptyResult()
}

func operationDeleteReminder(_ store: EKEventStore, payload: DeleteReminderPayload) throws -> EmptyResult {
  let reminder = try locateReminderByName(store: store, listName: payload.listName, reminderName: payload.reminderName)
  try store.remove(reminder, commit: true)
  return EmptyResult()
}

func operationCreateList(_ store: EKEventStore, payload: CreateListPayload) throws -> CreateIdResult {
  let existing = allReminderCalendars(store)
  if existing.contains(where: { $0.title == payload.name }) {
    throw HelperError.message("List '\(payload.name)' already exists")
  }

  let calendar = EKCalendar(for: .reminder, eventStore: store)
  calendar.title = payload.name

  if let source = store.defaultCalendarForNewReminders()?.source {
    calendar.source = source
  } else if let source = store.sources.first(where: { $0.sourceType == .calDAV || $0.sourceType == .local || $0.sourceType == .exchange }) {
    calendar.source = source
  } else if let source = store.sources.first {
    calendar.source = source
  } else {
    throw HelperError.message("No reminder source available for creating lists")
  }

  try store.saveCalendar(calendar, commit: true)
  return CreateIdResult(id: calendar.calendarIdentifier)
}

func operationDeleteList(_ store: EKEventStore, payload: DeleteListPayload) throws -> EmptyResult {
  let calendars = allReminderCalendars(store)
  guard let calendar = calendarByName(payload.name, calendars: calendars) else {
    throw HelperError.message("List '\(payload.name)' not found")
  }

  try store.removeCalendar(calendar, commit: true)
  return EmptyResult()
}

func run() throws {
  let args = CommandLine.arguments
  guard args.count >= 2 else {
    throw HelperError.message("Missing operation argument")
  }

  let op = args[1]
  let payloadJSON = args.count >= 3 ? args[2] : "{}"

  let store = EKEventStore()
  try ensureAccess(store)

  switch op {
  case "listLists":
    let result = try operationListLists(store)
    emitJSON(SuccessEnvelope(result: result))
  case "listReminders":
    let payload = try parsePayload(ListRemindersPayload.self, from: payloadJSON)
    let result = try operationListReminders(store, payload: payload)
    emitJSON(SuccessEnvelope(result: result))
  case "countReminders":
    let payload = try parsePayload(CountRemindersPayload.self, from: payloadJSON)
    let result = try operationCountReminders(store, payload: payload)
    emitJSON(SuccessEnvelope(result: result))
  case "createReminder":
    let payload = try parsePayload(CreateReminderPayload.self, from: payloadJSON)
    let result = try operationCreateReminder(store, payload: payload)
    emitJSON(SuccessEnvelope(result: result))
  case "updateReminder":
    let payload = try parsePayload(UpdateReminderPayload.self, from: payloadJSON)
    let result = try operationUpdateReminder(store, payload: payload)
    emitJSON(SuccessEnvelope(result: result))
  case "deleteReminder":
    let payload = try parsePayload(DeleteReminderPayload.self, from: payloadJSON)
    let result = try operationDeleteReminder(store, payload: payload)
    emitJSON(SuccessEnvelope(result: result))
  case "createList":
    let payload = try parsePayload(CreateListPayload.self, from: payloadJSON)
    let result = try operationCreateList(store, payload: payload)
    emitJSON(SuccessEnvelope(result: result))
  case "deleteList":
    let payload = try parsePayload(DeleteListPayload.self, from: payloadJSON)
    let result = try operationDeleteList(store, payload: payload)
    emitJSON(SuccessEnvelope(result: result))
  default:
    throw HelperError.message("Unsupported operation: \(op)")
  }
}

do {
  try run()
} catch {
  let message: String
  if let helperError = error as? HelperError {
    switch helperError {
    case .message(let text):
      message = text
    }
  } else {
    message = error.localizedDescription
  }

  emitJSON(ErrorEnvelope(error: message))
  exit(1)
}
