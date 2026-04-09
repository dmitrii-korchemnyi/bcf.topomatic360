import { IssuePriority, IssueStatus, IssueType } from "../domain/model";

export const ISSUE_STATUSES: IssueStatus[] = ["Новая", "Активная", "В работе", "Устранена", "Закрыта", "Переоткрыта"];
export const ISSUE_PRIORITIES: IssuePriority[] = ["Низкий", "Обычный", "Высокий", "Критический"];
export const ISSUE_TYPES: IssueType[] = ["Замечание", "Коллизия", "Проверка", "Вопрос", "Предложение", "Ошибка моделирования"];
